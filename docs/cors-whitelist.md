# CORS Whitelist

## Overview

The API enforces a strict origin whitelist. Requests from origins not in the list receive a `CORS error` response — the browser blocks them before any payload is read.

Wildcard `*` is never used.

## Configuration

Set the `ALLOWED_ORIGINS` environment variable in `apps/api/.env` (comma-separated, no spaces):

```
ALLOWED_ORIGINS=https://nexvideo.com,https://www.nexvideo.com
```

Server-to-server requests (no `Origin` header) are always allowed.

## Origins by Environment

| Environment | `ALLOWED_ORIGINS` |
|-------------|-------------------|
| Local dev   | `http://localhost:3001` |
| Staging     | `https://nexvideo-web.onrender.com` |
| Production  | `https://nexvideo.com,https://www.nexvideo.com` |

## Render deployment

Add `ALLOWED_ORIGINS` to the nexvideo-api service environment variables in the Render dashboard.

## Adding a new origin

1. Add the URL to `ALLOWED_ORIGINS` (comma-separated).
2. Redeploy the API.
3. Update this table.

## Testing

```bash
# Should succeed (200 or 4xx depending on route auth, never CORS error)
curl -H "Origin: https://nexvideo.com" https://api.nexvideo.com/health -v

# Should fail at CORS (no response body, browser blocks)
curl -H "Origin: https://evil.example.com" https://api.nexvideo.com/health -v
# Response includes: Access-Control-Allow-Origin header will be absent
```
