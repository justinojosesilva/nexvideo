#!/usr/bin/env bash
# Restore NexVideo Postgres database from an S3-compatible backup.
#
# Usage:
#   ./scripts/restore-postgres.sh <s3-key-or-filename>
#
# Examples:
#   ./scripts/restore-postgres.sh nexvideo-20260419T120000Z.dump
#   ./scripts/restore-postgres.sh backups/daily/nexvideo-20260419T120000Z.dump
#
# Required env vars:
#   DATABASE_URL          — Postgres connection string for the TARGET database
#   BACKUP_S3_BUCKET      — S3/R2 bucket name
#   BACKUP_S3_ENDPOINT    — S3 endpoint URL (omit for AWS; set for R2)
#   AWS_ACCESS_KEY_ID     — S3/R2 access key
#   AWS_SECRET_ACCESS_KEY — S3/R2 secret key
#   AWS_DEFAULT_REGION    — AWS region (default: us-east-1)
#
# ⚠️  WARNING: This script DROPS and re-creates the target database.
#              NEVER run against production without explicit approval.

set -euo pipefail

BACKUP_KEY="${1:-}"
if [ -z "${BACKUP_KEY}" ]; then
  echo "Usage: $0 <s3-key-or-filename>" >&2
  echo "  e.g. $0 nexvideo-20260419T120000Z.dump" >&2
  exit 1
fi

# ── Validate required vars ────────────────────────────────────────────────────
for var in DATABASE_URL BACKUP_S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: required env var '$var' is not set" >&2
    exit 1
  fi
done

AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
PREFIX="${BACKUP_PREFIX:-backups/daily}"

# Resolve full S3 key
if [[ "${BACKUP_KEY}" != */* ]]; then
  BACKUP_KEY="${PREFIX}/${BACKUP_KEY}"
fi

FILENAME=$(basename "${BACKUP_KEY}")
TMPFILE="/tmp/${FILENAME}"

ENDPOINT_ARG=""
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  ENDPOINT_ARG="--endpoint-url ${BACKUP_S3_ENDPOINT}"
fi

# ── Safety prompt ─────────────────────────────────────────────────────────────
DB_HOST=$(echo "${DATABASE_URL}" | grep -oP '(?<=@)[^:/]+' || echo "unknown")
echo ""
echo "⚠️  WARNING: This will DROP and restore the database at: ${DB_HOST}"
echo "   Backup file: ${BACKUP_KEY}"
echo ""
read -rp "Type 'yes' to continue: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# ── Download ──────────────────────────────────────────────────────────────────
echo "[restore] Downloading s3://${BACKUP_S3_BUCKET}/${BACKUP_KEY}"
# shellcheck disable=SC2086
aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_KEY}" "${TMPFILE}" \
  --region "${AWS_DEFAULT_REGION}" \
  ${ENDPOINT_ARG}

echo "[restore] Download complete ($(du -sh "${TMPFILE}" | cut -f1))"

# ── Restore ───────────────────────────────────────────────────────────────────
echo "[restore] Restoring to database…"

# Drop existing connections (Postgres 13+)
psql "${DATABASE_URL}" -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid();
" || true

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --dbname="${DATABASE_URL}" \
  "${TMPFILE}"

rm -f "${TMPFILE}"
echo "[restore] Restore complete."

# ── Post-restore validation ───────────────────────────────────────────────────
echo "[restore] Running quick sanity check…"
ROW_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "[restore] users table row count: ${ROW_COUNT}"
echo "[restore] Done."
