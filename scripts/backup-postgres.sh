#!/usr/bin/env bash
# Backup NexVideo Postgres database to S3-compatible storage (AWS S3 or Cloudflare R2).
#
# Required env vars:
#   DATABASE_URL          — Postgres connection string
#   BACKUP_S3_BUCKET      — S3/R2 bucket name (e.g. nexvideo-backups)
#   BACKUP_S3_ENDPOINT    — S3 endpoint URL (omit for AWS; set for R2: https://<account>.r2.cloudflarestorage.com)
#   AWS_ACCESS_KEY_ID     — S3/R2 access key
#   AWS_SECRET_ACCESS_KEY — S3/R2 secret key
#   AWS_DEFAULT_REGION    — AWS region (default: us-east-1; set to "auto" for R2)
#
# Optional env vars:
#   BACKUP_RETENTION_DAYS — Number of daily backups to keep (default: 7)
#   BACKUP_PREFIX         — S3 key prefix (default: backups/daily)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
PREFIX="${BACKUP_PREFIX:-backups/daily}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="nexvideo-${TIMESTAMP}.dump"
TMPFILE="/tmp/${FILENAME}"

# ── Validate required vars ────────────────────────────────────────────────────
for var in DATABASE_URL BACKUP_S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: required env var '$var' is not set" >&2
    exit 1
  fi
done

AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

# ── Dump ──────────────────────────────────────────────────────────────────────
echo "[backup] Starting pg_dump → ${TMPFILE}"
pg_dump \
  --format=custom \
  --compress=9 \
  --no-password \
  "${DATABASE_URL}" \
  --file="${TMPFILE}"

echo "[backup] Dump complete ($(du -sh "${TMPFILE}" | cut -f1))"

# ── Upload ────────────────────────────────────────────────────────────────────
S3_URI="s3://${BACKUP_S3_BUCKET}/${PREFIX}/${FILENAME}"

ENDPOINT_ARG=""
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  ENDPOINT_ARG="--endpoint-url ${BACKUP_S3_ENDPOINT}"
fi

echo "[backup] Uploading to ${S3_URI}"
# shellcheck disable=SC2086
aws s3 cp "${TMPFILE}" "${S3_URI}" \
  --region "${AWS_DEFAULT_REGION}" \
  ${ENDPOINT_ARG}

rm -f "${TMPFILE}"
echo "[backup] Upload complete"

# ── Retention — delete backups older than RETENTION_DAYS ─────────────────────
CUTOFF=$(date -u -d "-${RETENTION_DAYS} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
  || date -u -v "-${RETENTION_DAYS}d" +"%Y-%m-%dT%H:%M:%SZ")  # macOS fallback

echo "[backup] Pruning backups older than ${RETENTION_DAYS} days (cutoff: ${CUTOFF})"

# shellcheck disable=SC2086
aws s3 ls "s3://${BACKUP_S3_BUCKET}/${PREFIX}/" \
  --region "${AWS_DEFAULT_REGION}" \
  ${ENDPOINT_ARG} \
  | awk '{print $4}' \
  | while read -r key; do
      FILE_DATE=$(echo "${key}" | grep -oP '\d{8}T\d{6}Z' | head -1 || true)
      if [ -z "${FILE_DATE}" ]; then continue; fi

      FILE_TS=$(date -u -d "${FILE_DATE:0:8} ${FILE_DATE:9:2}:${FILE_DATE:11:2}:${FILE_DATE:13:2}" +%s 2>/dev/null \
        || date -u -j -f "%Y%m%dT%H%M%SZ" "${FILE_DATE}" +%s)
      CUTOFF_TS=$(date -u -d "${CUTOFF}" +%s 2>/dev/null \
        || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "${CUTOFF}" +%s)

      if [ "${FILE_TS}" -lt "${CUTOFF_TS}" ]; then
        echo "[backup] Deleting old backup: ${key}"
        # shellcheck disable=SC2086
        aws s3 rm "s3://${BACKUP_S3_BUCKET}/${PREFIX}/${key}" \
          --region "${AWS_DEFAULT_REGION}" \
          ${ENDPOINT_ARG}
      fi
    done

echo "[backup] Done. Backup stored at ${S3_URI}"
