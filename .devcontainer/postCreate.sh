#!/bin/bash
# postCreate.sh - Automatically configures the workspace upon creation of the Dev Container.
set -e

echo "[MineSpace] Setting up scripts and installation environment..."

# Make all bash scripts executable
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true

# Run the installation script
if [ -f "scripts/install.sh" ]; then
    bash scripts/install.sh
else
    echo "scripts/install.sh not found yet. Skipping immediate execution."
fi

echo "[MineSpace] DevContainer postCreate configuration complete."
