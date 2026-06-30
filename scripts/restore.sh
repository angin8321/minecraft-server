#!/bin/bash
# restore.sh - Restores a zip backup and updates active files.

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: restore.sh <path_to_backup_zip>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file $BACKUP_FILE not found."
    exit 1
fi

echo "[MineSpace Restore] Restoring backup from $BACKUP_FILE..."

# Extract files, overwriting safely.
unzip -o "$BACKUP_FILE" -d .

echo "[MineSpace Restore] Restoration complete."
