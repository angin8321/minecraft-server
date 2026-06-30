#!/bin/bash
# restart.sh - Restarts the MineSpace panel and all servers.

echo "[MineSpace Panel] Restarting MineSpace..."
bash scripts/stop.sh
sleep 2
bash scripts/start.sh
