# Stripe Live Mode — Go-Live Checklist

## Architecture Note

The nexvideo API uses **server-side Stripe Checkout** (redirect flow). No Stripe.js or `STRIPE_PUBLISHABLE_KEY` is needed on the frontend — only `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are required.

---

## Pre-requisites

- [ ] Stripe account verified and activated for live payments
- [ ] Business details completed in Stripe Dashboard (legal name, address, bank account)
- [ ] Test mode validated: all 7 TCs in `docs/stripe-e2e-test-playbook.md` passed

---

## Step 1 — Replicate Products & Prices in Live Mode

In the Stripe Dashboard, switch to **Live mode** (toggle top-left).

Create the same products and price IDs that exist in test mode:

| Product | Interval | Price ID (live) | Action |
|---------|----------|-----------------|--------|
| Basic   | monthly  | `price_live_xxx` | Create |
| Pro     | monthly  | `price_live_xxx` | Create |
| Business| monthly  | `price_live_xxx` | Create |

After creating, update `STRIPE_PRICE_ID_*` env vars in Render with the live price IDs.

---

## Step 2 — Configure Environment Variables in Render

In the Render dashboard → nexvideo-api service → Environment:

| Variable | Live value |
|----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe Dashboard → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from live webhook endpoint — see Step 3) |
| `NODE_ENV` | `production` |
| `STRIPE_SUCCESS_URL` | `https://nexvideo.com/billing/success` |
| `STRIPE_CANCEL_URL` | `https://nexvideo.com/billing/cancel` |
| `STRIPE_PORTAL_RETURN_URL` | `https://nexvideo.com/billing` |

> The API's env validation (`src/config/env.validation.ts`) enforces `sk_live_` only when `NODE_ENV=production`. Setting `NODE_ENV=production` with a `sk_test_` key will fail validation at startup.

**Keys must never be committed to the repository.** The `.gitleaks.toml` pre-commit hook will block any accidental commit of live Stripe keys.

---

## Step 3 — Create Live Webhook Endpoint

In Stripe Dashboard (Live mode) → Developers → Webhooks → **Add endpoint**:

- **URL**: `https://api.nexvideo.com/billing/webhook` (or your Render API URL)
- **Events to listen**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.upcoming`

After creating, copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Render.

---

## Step 4 — Review Stripe Go-Live Checklist

Review the official checklist at https://stripe.com/docs/go-live:

- [ ] Business details complete (name, address, bank account)
- [ ] Refund policy displayed on checkout/pricing page
- [ ] Terms of Service and Privacy Policy accessible
- [ ] Customer support email or URL configured in Stripe Dashboard
- [ ] Statement descriptor set (appears on customer's bank statement)
- [ ] Fraud prevention: Radar rules reviewed (Dashboard → Radar)
- [ ] Email receipts configured (Dashboard → Settings → Emails)

---

## Step 5 — Smoke Test in Production

After deploying with live keys:

1. Complete a real purchase with a real card (minimum amount)
2. Verify webhook received in Stripe Dashboard → Developers → Webhooks → live endpoint → events
3. Confirm subscription active in database: `SELECT * FROM "Subscription" WHERE status = 'active'`
4. Confirm billing email received
5. Cancel subscription via Customer Portal and verify downgrade flow

---

## Rollback

If live mode must be reverted:

1. In Render, switch `STRIPE_SECRET_KEY` back to `sk_test_...` and `NODE_ENV` to `staging`
2. Redeploy
3. New subscriptions will use test mode again (existing live subscriptions unaffected)
