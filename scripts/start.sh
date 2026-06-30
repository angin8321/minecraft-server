#!/bin/bash
# start.sh - Starts the MineSpace web panel daemon.
# This daemon will subsequently manage starting the Minecraft server and Playit tunnels.

# Ensure Node environment is configured
if [ ! -d "panel/node_modules" ]; then
    echo "[MineSpace Panel] Node dependencies missing. Running install.sh..."
    bash scripts/install.sh
fi

echo "[MineSpace Panel] Initializing MineSpace Web Panel Server..."
cd panel
node server.js
