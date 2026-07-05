# YouTube OAuth Credential Rotation Runbook

> **Scope:** Google OAuth 2.0 Client ID (Web Application) used by NexVideo to authorize YouTube uploads on behalf of user organizations.

---

## Credentials overview

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID (`…apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Authorized redirect URI registered in Google Cloud Console |

Each environment (local, staging, production) **must** use its own Client ID + Secret.
Never share production credentials with staging.

---

## Creating credentials (first time)

1. Open [Google Cloud Console](https://console.cloud.google.com) → select the NexVideo project.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
3. Choose **Web application**.
4. Add the authorized redirect URIs:
   - Local: `http://localhost:3002/youtube/oauth/callback`
   - Staging: `https://staging.nexvideo.com/youtube/oauth/callback`
   - Production: `https://nexvideo.com/youtube/oauth/callback`
5. Download the JSON or copy the Client ID and Secret.
6. Store them in the appropriate secret manager entry (see below).

---

## Secret manager storage

| Environment | Secret Manager | Secret name |
|---|---|---|
| Local | `.env` file (never commit) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Staging | AWS Secrets Manager / GCP Secret Manager | `nexvideo/staging/google-oauth` |
| Production | AWS Secrets Manager / GCP Secret Manager | `nexvideo/prod/google-oauth` |

---

## Rotating credentials

> Rotating causes a brief window where in-flight OAuth flows may fail. Schedule during low-traffic hours.

1. **Create new credentials** in Google Cloud Console (same steps as above, same redirect URIs).
2. **Update the secret manager entry** for the target environment with the new Client ID + Secret.
3. **Deploy** the new environment variables to the target environment.
4. **Verify** by completing an OAuth flow end-to-end: `GET /youtube/oauth/start` → consent → callback.
5. **Revoke the old credentials** in Google Cloud Console → Credentials → delete the old entry.

---

## Revoking user tokens

> **Note:** there is currently no public API endpoint for user-initiated disconnect. `YoutubeOAuthService.revokeTokens(organizationId)` (`apps/api/src/auth/services/youtube-oauth.service.ts`) implements the revoke-and-delete logic — it calls `https://oauth2.googleapis.com/revoke` and deletes the `youtube_oauth_tokens` row — but it is not currently wired to a route on `YoutubeController`. Until a `DELETE /youtube/oauth` endpoint is added, revoking a compromised token requires calling this service directly (e.g. via a one-off script or REPL) or deleting the row from `youtube_oauth_tokens` and revoking access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

---

## Scope reference

NexVideo requests the following OAuth scopes:

| Scope | Purpose |
|---|---|
| `https://www.googleapis.com/auth/youtube.upload` | Upload videos to the user's channel |
| `https://www.googleapis.com/auth/youtube.readonly` | Read channel and video metadata |
| `https://www.googleapis.com/auth/yt-analytics.readonly` | Read YouTube Analytics data (views, watch time, revenue) |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `No refresh token received` | User already authorized without `prompt=consent` | Ask user to revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and re-authorize |
| `Token refresh failed` | Refresh token revoked or expired | User must re-authorize via `GET /youtube/oauth/start` |
| `redirect_uri_mismatch` | URI in request does not match Google Console | Add the URI in Google Cloud Console → Credentials |
| `invalid_client` | Wrong Client ID / Secret | Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` match the target environment |
