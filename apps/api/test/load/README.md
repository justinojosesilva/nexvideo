# Load tests

k6 scripts for performance validation. See [`docs/stripe-webhook-load-test.md`](../../../../docs/stripe-webhook-load-test.md) for the full playbook (SLO, alerts, runbook).

| Script | Endpoint | Default profile |
|--------|----------|-----------------|
| `stripe-webhook.k6.js` | `POST /billing/webhook` | 100 RPS sustained + 300 RPS spike |

Quick start:

```bash
brew install k6
BASE_URL=https://api-staging.nexvideo.app \
SIG_SECRET=whsec_staging_xxxxx \
k6 run apps/api/test/load/stripe-webhook.k6.js
```

Reports are written to `*.report.json` next to each script (gitignored).
