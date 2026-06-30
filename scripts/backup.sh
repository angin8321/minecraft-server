#!/bin/bash
# backup.sh - Creates a zip backup of the world, settings, and configs stored in the server directory.

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
CONFIG_FILE="config/config.json"

mkdir -p "$BACKUP_DIR"

if [ -f "$CONFIG_FILE" ]; then
    WORLD_NAME=$(jq -r '.WORLD_NAME // "world"' "$CONFIG_FILE")
else
    WORLD_NAME="world"
fi

ZIP_FILE="${BACKUP_DIR}/backup_${WORLD_NAME}_${TIMESTAMP}.zip"

echo "[MineSpace Backup] Archiving files to ${ZIP_FILE}..."

# Zip the world folders, plugins, mods, config directories, server.properties
zip -r "$ZIP_FILE" server/server.properties server/spigot.yml server/bukkit.yml server/paper.yml server/"$WORLD_NAME" server/"${WORLD_NAME}_nether" server/"${WORLD_NAME}_the_end" plugins/ mods/ config/ -x "server/logs/*" -x "backups/*" || true

echo "[MineSpace Backup] Completed backup successfully: ${ZIP_FILE}"
echo "BACKUP_FILE_PATH:${ZIP_FILE}"
