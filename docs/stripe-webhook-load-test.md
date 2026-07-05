# Stripe Webhook — Load Test & Alerting Playbook

Tracks the load profile, run procedure, results template, and the latency alerting
rules required by [TASK-042](../.pm/tasks/TASK-042.md) for `POST /billing/webhook`.

## 1. Why we load-test this endpoint

The Stripe webhook is the only inbound path that mutates subscription state:

- `checkout.session.completed` — creates `Subscription`, attaches it to the org.
- `invoice.paid` / `invoice.payment_failed` — updates status, sends emails.
- `customer.subscription.updated` / `customer.subscription.deleted` — plan/limit changes.

Stripe **retries with exponential backoff for up to 3 days** on any non-2xx. A slow or
flaky endpoint produces duplicate processing, billing inconsistencies, and customer
support load. Our SLO must hold even during renewal bursts at the top of the hour.

## 2. Target SLO

| Metric | Target | Hard fail |
|--------|--------|-----------|
| Error rate (`http_req_failed`) | < 0.5% | ≥ 1% |
| Latency p50 | < 80 ms | ≥ 150 ms |
| Latency p95 | < 250 ms | ≥ 500 ms |
| Latency p99 | < 500 ms | ≥ 1000 ms |
| Sustained throughput | ≥ 100 RPS for 2 min | < 80 RPS |
| Spike survivability | 300 RPS for 30s without 5xx | any 5xx |
| Signature verify CPU | < 5 ms p95 | ≥ 10 ms |

## 3. Load profile (k6)

Script: [`apps/api/test/load/stripe-webhook.k6.js`](../apps/api/test/load/stripe-webhook.k6.js)

Default profile (`PROFILE=full`):

| Stage | Duration | Arrival rate |
|-------|----------|--------------|
| Warm-up | 30s | 1 → 20 RPS |
| Sustained | 2 min | 100 RPS |
| Spike | 30s | 300 RPS |
| Settle | 1 min | 100 RPS |
| Ramp-down | 30s | → 0 RPS |

Other profiles:
- `smoke` — 10s @ 5 VUs, sanity-check connectivity & signature header.
- `spike` — 30s @ 300 RPS only, isolated burst.

Event payloads are rotated across the 5 event types we actually handle, with a
**unique event id per request** to exercise the idempotency path (insert into
`stripe_webhook_events`).

## 4. Running the test

### Prerequisites

- `brew install k6` (or [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation/)).
- A **staging** API instance (NEVER production).
- A `STRIPE_WEBHOOK_SECRET` value known by both the API and the runner.

### Commands

```bash
# Smoke (10s)
BASE_URL=https://api-staging.nexvideo.app \
SIG_SECRET=whsec_staging_xxxxx \
PROFILE=smoke \
k6 run apps/api/test/load/stripe-webhook.k6.js

# Full run (≈5 min)
BASE_URL=https://api-staging.nexvideo.app \
SIG_SECRET=whsec_staging_xxxxx \
k6 run apps/api/test/load/stripe-webhook.k6.js
```

The script writes a machine-readable summary to
`apps/api/test/load/stripe-webhook.report.json` for archival in CI artifacts.

### Local dry-run (no signature verification)

For local profiling we can short-circuit signature checks by running the API with
`STRIPE_TEST_SKIP_SIG=1` (see `apps/api/.env.example`). Never enable this flag on
staging or production.

## 5. Result report template

Copy this section into the PR description / runbook after each run:

```markdown
### Stripe webhook load-test report — <date>

- Commit: <sha>
- Environment: staging
- k6 version: <vX.Y.Z>
- Profile: full

| Metric | Value | Threshold | Pass? |
|--------|-------|-----------|-------|
| RPS (avg)              |       | ≥ 100     |       |
| Error rate             |       | < 1%      |       |
| p50 latency            |       | < 80ms    |       |
| p95 latency            |       | < 250ms   |       |
| p99 latency            |       | < 500ms   |       |
| Signature p95          |       | < 5ms     |       |
| 5xx during spike       |       | 0         |       |

Findings:
-

Action items:
-
```

## 6. Latency & error alerts

Configured on the same platform that runs `/health` checks
(see [`uptime-monitoring-setup.md`](./uptime-monitoring-setup.md)).
We use **two complementary layers**:

### 6.1 Synthetic check (Better Uptime)

- **Monitor**: `POST https://api.nexvideo.app/billing/webhook` with a **canary
  payload** (`type: "test.canary"` — the handler short-circuits canaries with a
  200 without touching the DB).
- Interval: 60s. Regions: 2.
- Expected: status `200`, body `OK` or empty.
- **Alert thresholds**:
  - Status ≠ 200 for ≥ 2 consecutive checks → page on-call (P1).
  - Response time > 1000ms p95 over 5 min → notify Slack #ops (P2).

### 6.2 In-process metric alerts (Sentry / OpenTelemetry)

The Nest interceptor already records `http_server_duration_ms` per route, tagged
with `route="/billing/webhook"`.

Configure the following rules in Sentry Alerts:

| Alert | Window | Condition | Severity |
|-------|--------|-----------|----------|
| Webhook p95 spike   | 5 min | p95(`/billing/webhook`) > 500ms | warning |
| Webhook p99 spike   | 5 min | p99(`/billing/webhook`) > 1000ms | critical |
| Webhook error spike | 5 min | error rate > 2% | critical |
| Idempotency dup ratio | 15 min | dup_inserts / total > 5% | warning |
| Stripe sig rejected | 5 min | count(`stripe_signature_invalid`) > 10 | critical |

Routing:
- **Critical** → PagerDuty (oncall-payments rotation).
- **Warning** → `#ops-alerts` Slack channel + email digest.

### 6.3 Runbook on alert

1. Open the Sentry alert; capture trace IDs.
2. Check Stripe Dashboard → Developers → Webhook deliveries: are events
   piling up? Is Stripe retrying?
3. Compare incident window with `usage_logs` / DB CPU graph.
4. If degradation: switch the webhook handler to **queue mode**
   (drop on BullMQ, return 202) — feature flag `STRIPE_WEBHOOK_ASYNC`.
5. Notify Stripe Support if signature errors spike (possible secret rotation in
   the dashboard without staged rollout).

## 7. Rollback / kill-switch

- Set `STRIPE_WEBHOOK_PAUSED=1` on the API service — handler returns 503 so
  Stripe retries later. Use only with `cancel_at_period_end` workaround already
  in place to prevent revenue loss.
- For a corrupted state caused by a thundering herd, replay events via
  `stripe events resend evt_xxx` after the fix is deployed.

## 8. Known limitations

- k6 does not currently reuse Stripe's webhook timestamp tolerance window
  (5 minutes). Long runs (>5 min) are fine because each request generates a
  fresh `t=`.
- Idempotency table grows with the test volume. After a load run, prune
  `stripe_webhook_events` rows older than 1h on the staging DB.
- TLS termination latency on the load runner may add 5–15ms to p95 vs
  in-cluster measurements; numbers should be compared to the same harness.
