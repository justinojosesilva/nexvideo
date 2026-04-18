# Uptime Monitoring Setup

External uptime monitoring for nexvideo using **Better Uptime** (recommended) or UptimeRobot.

## Endpoints to Monitor

| Name | URL | Method | Expected Status |
|------|-----|--------|----------------|
| API Health | `https://nexvideo-api.onrender.com/health` | GET | 200 |
| Web App | `https://nexvideo-web.onrender.com` | GET | 200 |

The `/health` endpoint returns `{ status: "healthy" | "degraded" | "unhealthy", ... }` — it checks Postgres, Redis, and BullMQ workers without requiring auth.

---

## Better Uptime (Recommended)

### 1. Create account

Sign up at [betteruptime.com](https://betteruptime.com) (free tier: up to 10 monitors, 3-minute interval).

For ≤1 minute interval, use **Starter plan**.

### 2. Add monitors

For each endpoint in the table above:

1. **Monitors** → **New monitor**
2. **Monitor type**: HTTP
3. **URL**: paste the endpoint URL
4. **Check interval**: `60 seconds` (1 minute)
5. **Regions**: select at least 2 (e.g. US East + EU West) to reduce false positives
6. **Request timeout**: `10 seconds`
7. **Expected status code**: `200`
8. Save

### 3. Configure alert policy

1. **Alert policies** → **New policy**
2. **Wait before alerting**: `1 minute` (avoids flapping alerts)
3. **Notification channels**: add `justinojosesilva@gmail.com`
4. Apply the policy to all monitors

### 4. Status page

1. **Status pages** → **New status page**
2. **Subdomain**: e.g. `nexvideo.betteruptime.com`
3. Add both monitors to the page
4. **Visibility**: Public
5. Save and share the URL

---

## UptimeRobot (Alternative — Free)

Free tier supports 50 monitors with 5-minute interval. For ≤1 minute interval, use **Pro plan**.

### 1. Create account

Sign up at [uptimerobot.com](https://uptimerobot.com).

### 2. Add monitors

For each endpoint:

1. **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: e.g. `nexvideo-api-health`
4. **URL**: paste endpoint URL
5. **Monitoring Interval**: 1 minute (Pro) or 5 minutes (Free)
6. **Alert contacts**: add your email
7. Save

### 3. Status page

1. **Status Pages** → **Create Status Page**
2. Add all monitors
3. Set visibility to **Public**
4. Use the provided `.statuspage.io` URL or custom domain

---

## Validation Checklist

After setup:

- [ ] All monitors show **Up** status
- [ ] Test alert: pause one monitor temporarily → confirm email arrives
- [ ] Status page URL is accessible publicly
- [ ] Check interval shows ≤ 1 min in monitor settings

## Dev Local Testing

To test the health endpoint locally:

```bash
curl http://localhost:3002/health
# Expected: {"status":"healthy","timestamp":"...","redis":{"status":"ok"},"database":{"status":"ok"},"workers":{"status":"ok",...}}
```
