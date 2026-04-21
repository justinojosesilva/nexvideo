# Stripe Webhook Idempotency

This document describes the two-layer idempotency strategy protecting the nexvideo billing system from duplicate Stripe webhook deliveries.

## Why Idempotency Matters

Stripe guarantees **at-least-once delivery**. The same event can be delivered multiple times due to network issues, retries, or Stripe's own infrastructure. Without idempotency guards, replayed events can create duplicate subscriptions, charge customers twice, or send repeated emails.

## Layer 1 — Event-Level Deduplication (`stripe_webhook_events`)

Every incoming webhook event is checked against the `stripe_webhook_events` table **before any business logic runs**.

```
POST /billing/webhook
  │
  ├─ verify signature (Stripe SDK)
  │
  ├─ SELECT FROM stripe_webhook_events WHERE stripeEventId = evt.id
  │    ├─ found → log + return (no-op)
  │    └─ not found → INSERT stripeEventId + type
  │
  └─ process business logic (checkout, subscription update, etc.)
```

**Table schema:**

```sql
CREATE TABLE stripe_webhook_events (
  id             TEXT PRIMARY KEY,
  stripeEventId  TEXT UNIQUE NOT NULL,  -- Stripe event ID (evt_...)
  type           TEXT NOT NULL,          -- e.g. "checkout.session.completed"
  processedAt    TIMESTAMP DEFAULT NOW()
);
```

This prevents any double processing when Stripe retries the same event.

## Layer 2 — Business-Logic Deduplication (`billing_notifications`)

Even if layer 1 somehow fails (race condition on simultaneous delivery), each business operation has its own idempotency guard:

| Event | Idempotency Key | Behavior on Duplicate |
|---|---|---|
| `checkout.session.completed` | `stripeSubscriptionId` | Update existing `Subscription` instead of creating a new one |
| `invoice.payment_failed` | `invoiceId + "payment_failed"` | Skip email if `BillingNotification` record exists |
| `customer.subscription.updated` (cancel warning) | `sub_{id}_cancel_warning + "cancellation_warning"` | Skip email if already notified |
| `customer.subscription.deleted` | `stripeSubscriptionId` | `findFirst` guard — does nothing if subscription not found |
| `customer.subscription.updated` | `stripeSubscriptionId` | `updateMany` — safe to rerun (idempotent by nature) |

## Race Condition Handling

If two requests deliver the same event ID simultaneously, both may pass the `findUnique` check before either `INSERT` completes. The `stripeEventId` column has a `UNIQUE` constraint, so the second `INSERT` will throw a unique constraint violation.

The current implementation does **not** catch this error — in practice Stripe does not deliver the same event concurrently, so this is acceptable. If higher concurrency guarantees are needed, wrap the check+insert in a `INSERT ... ON CONFLICT DO NOTHING` via `$executeRaw`.

## Retention Policy

The `stripe_webhook_events` table grows over time. Consider a cron job to prune records older than 30 days:

```sql
DELETE FROM stripe_webhook_events WHERE processedAt < NOW() - INTERVAL '30 days';
```

## Testing

Unit tests for event-level idempotency live in:

```
apps/api/src/billing/use-cases/handle-stripe-webhook.use-case.spec.ts
```

Key test cases:
- `skips processing and returns void when event ID was already recorded`
- `records event ID on first successful processing`
- `skips email when invoice was already notified (idempotent)` (layer 2)
- `skips warning email when already notified (idempotent)` (layer 2)

## Local Testing

To simulate a duplicate event delivery:

```bash
# First delivery (processed normally)
stripe trigger checkout.session.completed

# Replay the same event via Stripe CLI (use the event ID from the first trigger)
stripe events resend evt_xxxxxxxxxxxxxxxxxx
```

The second call should log `Skipping duplicate Stripe event evt_xxx` and return 200 without modifying the database.
