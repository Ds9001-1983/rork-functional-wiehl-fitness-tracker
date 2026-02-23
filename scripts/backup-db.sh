#!/bin/bash
# Database Backup Script for Fitness App
# Runs daily via cron, manages rotation (7 daily, 4 weekly)

set -euo pipefail

# Configuration
DB_NAME="${DB_NAME:-fitness_app}"
DB_USER="${DB_USER:-app_user}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fitness-app}"
LOG_FILE="${BACKUP_DIR}/backup.log"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DAY_OF_WEEK=$(date +%u) # 1=Monday, 7=Sunday

# Create backup directory if needed
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting database backup..."

# Daily backup
DAILY_FILE="${BACKUP_DIR}/daily/backup_${DATE}.sql.gz"
if pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${DAILY_FILE}"; then
  FILESIZE=$(du -h "${DAILY_FILE}" | cut -f1)
  log "Daily backup created: ${DAILY_FILE} (${FILESIZE})"
else
  log "ERROR: Daily backup failed!"
  exit 1
fi

# Weekly backup (on Sundays)
if [ "${DAY_OF_WEEK}" = "7" ]; then
  WEEKLY_FILE="${BACKUP_DIR}/weekly/backup_week_${DATE}.sql.gz"
  cp "${DAILY_FILE}" "${WEEKLY_FILE}"
  log "Weekly backup created: ${WEEKLY_FILE}"
fi

# Rotation: keep last 7 daily backups
DAILY_COUNT=$(find "${BACKUP_DIR}/daily" -name "backup_*.sql.gz" -type f | wc -l)
if [ "${DAILY_COUNT}" -gt 7 ]; then
  find "${BACKUP_DIR}/daily" -name "backup_*.sql.gz" -type f -printf '%T@ %p\n' | \
    sort -n | head -n $((DAILY_COUNT - 7)) | cut -d' ' -f2- | \
    while read -r file; do
      rm -f "${file}"
      log "Removed old daily backup: ${file}"
    done
fi

# Rotation: keep last 4 weekly backups
WEEKLY_COUNT=$(find "${BACKUP_DIR}/weekly" -name "backup_week_*.sql.gz" -type f | wc -l)
if [ "${WEEKLY_COUNT}" -gt 4 ]; then
  find "${BACKUP_DIR}/weekly" -name "backup_week_*.sql.gz" -type f -printf '%T@ %p\n' | \
    sort -n | head -n $((WEEKLY_COUNT - 4)) | cut -d' ' -f2- | \
    while read -r file; do
      rm -f "${file}"
      log "Removed old weekly backup: ${file}"
    done
fi

log "Backup completed successfully."
