#!/bin/bash
# stop.sh - Command script to stop the MineSpace Web Panel and child services.

echo "[MineSpace Panel] Resolving active MineSpace process..."

# Send API request to clean shutdown or find and kill panel process
PORT=$(jq -r '.PANEL_PORT // 3000' config/config.json 2>/dev/null || echo 3000)

curl -X POST http://localhost:${PORT}/api/server/stop -H "Content-Type: application/json" -d '{"force": true}' &>/dev/null || true

# Backup safety kill
PID=$(pgrep -f "node server.js" || true)
if [ -n "$PID" ]; then
    echo "[MineSpace Panel] Killing process $PID"
    kill $PID
else
    echo "[MineSpace Panel] No running panel was found on this workspace."
fi
