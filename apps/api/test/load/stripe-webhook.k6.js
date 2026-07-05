/**
 * [TASK-042] Load test: POST /billing/webhook (Stripe webhook)
 *
 * Scenario
 * --------
 * Stripe spikes (renewals at the top of the hour, dunning retries) can produce
 * bursts of webhook traffic. This script simulates a 5-minute sustained load
 * + a 30s spike at minute 3 to validate the endpoint stays under SLO.
 *
 * Target SLO (production)
 * -----------------------
 *   - http_req_failed       < 1%
 *   - http_req_duration p95 < 250ms
 *   - http_req_duration p99 < 500ms
 *   - sustained throughput  ≥ 100 RPS
 *   - spike burst           300 RPS for 30s
 *
 * Notes
 * -----
 * - Signature verification is part of the critical path. To exercise the full
 *   handler (idempotency table + DB writes) you MUST point this at a staging
 *   environment whose STRIPE_WEBHOOK_SECRET matches the SIG_SECRET env below,
 *   OR run the API with STRIPE_TEST_SKIP_SIG=1 in a dedicated load env.
 * - Each request uses a unique event id (`evt_<vu>_<iter>_<ts>`) to stress
 *   the idempotency path realistically.
 *
 * Usage
 * -----
 *   k6 run \
 *     -e BASE_URL=https://api-staging.nexvideo.app \
 *     -e SIG_SECRET=whsec_xxx \
 *     apps/api/test/load/stripe-webhook.k6.js
 *
 *   # smoke (10s, 5 VUs)
 *   k6 run -e PROFILE=smoke ...
 *
 *   # spike only
 *   k6 run -e PROFILE=spike ...
 */

import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const SIG_SECRET = __ENV.SIG_SECRET || 'whsec_test_load_secret';
const PROFILE = __ENV.PROFILE || 'full';

const stages = {
  smoke: [
    { duration: '10s', target: 5 },
  ],
  spike: [
    { duration: '30s', target: 300 },
    { duration: '30s', target: 0 },
  ],
  full: [
    { duration: '30s', target: 20 },  // warm-up
    { duration: '2m', target: 100 },  // sustained
    { duration: '30s', target: 300 }, // spike
    { duration: '1m', target: 100 },  // settle
    { duration: '30s', target: 0 },   // ramp-down
  ],
};

export const options = {
  scenarios: {
    webhook_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 400,
      stages: stages[PROFILE] || stages.full,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],            // < 1% errors
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    'http_req_duration{event:invoice_paid}': ['p(95)<250'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

const signatureLatency = new Trend('stripe_sig_latency_ms');
const ok2xx = new Rate('webhook_2xx_rate');

// ─── Helpers ─────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.completed',
];

function buildEvent(vu, iter) {
  const ts = Math.floor(Date.now() / 1000);
  const type = EVENT_TYPES[(vu + iter) % EVENT_TYPES.length];
  return {
    id: `evt_${vu}_${iter}_${ts}_${Math.random().toString(36).slice(2, 8)}`,
    object: 'event',
    api_version: '2024-06-20',
    created: ts,
    type,
    data: {
      object: {
        id: `sub_test_${vu}_${iter}`,
        object: 'subscription',
        customer: `cus_test_${vu}`,
        status: 'active',
        current_period_end: ts + 30 * 24 * 60 * 60,
        items: { data: [{ price: { id: 'price_test_starter' } }] },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: `req_${ts}`, idempotency_key: null },
  };
}

/**
 * Build a Stripe-compatible signature header for the given body.
 * Matches Stripe SDK format: `t=<unix>,v1=<hmac_sha256(timestamp + "." + body, secret)>`.
 */
function signPayload(body, secret) {
  const t = Math.floor(Date.now() / 1000);
  const payload = `${t}.${body}`;
  const v1 = crypto.hmac('sha256', secret, payload, 'hex');
  return `t=${t},v1=${v1}`;
}

// ─── Default function ────────────────────────────────────────────────────

export default function () {
  const event = buildEvent(__VU, __ITER);
  const body = JSON.stringify(event);

  const sigStart = Date.now();
  const signature = signPayload(body, SIG_SECRET);
  signatureLatency.add(Date.now() - sigStart);

  const res = http.post(`${BASE_URL}/billing/webhook`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    tags: { event: event.type.replace(/\./g, '_') },
    timeout: '10s',
  });

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'no server error': (r) => r.status < 500,
  });

  ok2xx.add(ok);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'apps/api/test/load/stripe-webhook.report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const fmt = (v) => (v == null ? '—' : `${v.toFixed(1)}ms`);
  return `
─── Stripe Webhook Load Test Summary ───────────────────────────────────────
  Profile:           ${PROFILE}
  Target URL:        ${BASE_URL}/billing/webhook
  Iterations:        ${m.iterations?.values?.count ?? 0}
  Requests/sec avg:  ${(m.http_reqs?.values?.rate ?? 0).toFixed(1)}
  Error rate:        ${(((m.http_req_failed?.values?.rate ?? 0) * 100)).toFixed(2)}%

  Latency (HTTP)
    avg:             ${fmt(m.http_req_duration?.values?.avg)}
    med:             ${fmt(m.http_req_duration?.values?.med)}
    p95:             ${fmt(m.http_req_duration?.values?.['p(95)'])}
    p99:             ${fmt(m.http_req_duration?.values?.['p(99)'])}
    max:             ${fmt(m.http_req_duration?.values?.max)}

  Stripe signature
    avg:             ${fmt(m.stripe_sig_latency_ms?.values?.avg)}
    p95:             ${fmt(m.stripe_sig_latency_ms?.values?.['p(95)'])}

  Thresholds passed: ${Object.values(data.metrics)
    .every((mm) => !mm.thresholds || Object.values(mm.thresholds).every((t) => !t.fails))}
─────────────────────────────────────────────────────────────────────────────
`;
}
