#!/bin/bash
# Setup cron job for automatic database backups
# Run this script once on the server to configure daily backups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-db.sh"

# Make backup script executable
chmod +x "${BACKUP_SCRIPT}"

# Add cron job (daily at 3:00 AM)
CRON_JOB="0 3 * * * ${BACKUP_SCRIPT} >> /var/log/fitness-app-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
  echo "Cron job already exists. Updating..."
  crontab -l 2>/dev/null | grep -v "backup-db.sh" | { cat; echo "${CRON_JOB}"; } | crontab -
else
  echo "Adding new cron job..."
  (crontab -l 2>/dev/null; echo "${CRON_JOB}") | crontab -
fi

# Create backup directory
mkdir -p /var/backups/fitness-app/daily
mkdir -p /var/backups/fitness-app/weekly

echo "Backup cron job configured successfully!"
echo "Schedule: Daily at 3:00 AM"
echo "Backup location: /var/backups/fitness-app/"
echo "Retention: 7 daily + 4 weekly backups"
echo ""
echo "Verify with: crontab -l"
