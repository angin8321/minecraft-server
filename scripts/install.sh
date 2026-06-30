#!/bin/bash
# install.sh - Installs system dependencies, node modules, and checks environment setup.

# Ensure we log output
mkdir -p logs
exec tclout > >(tee -a logs/install.log) 2>&1 || exec > >(tee -a logs/install.log) 2>&1

echo "[MineSpace Installer] Starting installation tasks..."

# Function to check and install a packge via apt/dnf/pacman or notify. Since GitHub Codespaces is Debian-based, we use apt-get.
check_and_install() {
    CMD_NAME=$1
    PKG_NAME=$2
    if ! command -v "$CMD_NAME" &> /dev/null; then
        echo "[MineSpace Installer] $CMD_NAME is missing. Attempting to install package $PKG_NAME..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -y && sudo apt-get install -y "$PKG_NAME"
        else
            echo "[WARN] apt-get not found. Please install $PKG_NAME manually."
        fi
    else
        echo "[MineSpace Installer] $CMD_NAME is already installed."
    fi
}

# Verify and install dependencies
check_and_install "java" "openjdk-21-jdk"
check_and_install "tmux" "tmux"
check_and_install "curl" "curl"
check_and_install "wget" "wget"
check_and_install "jq" "jq"
check_and_install "unzip" "unzip"
check_and_install "zip" "zip"
check_and_install "git" "git"

# Initialize other required directory structures
mkdir -p server plugins mods worlds backups config panel/public logs

# Install Node.js dependencies
echo "[MineSpace Installer] Installing Node.js panel dependencies..."
if [ -f "panel/package.json" ]; then
    cd panel && npm install && cd ..
else
    # Create web panel package.json first
    cd panel
    npm init -y
    npm install express ws mime-types
    cd ..
fi

echo "[MineSpace Installer] Installation checks completed successfully."
