#!/bin/bash
# playit.sh - Handles downloads and updates of standalone Playit binary.

PLATFORM="bin-linux"
ARCH="amd64"
OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')

# Adjust platform and architecture for non-linux systems if applicable (e.g. Darwin, Windows)
if [[ "$OS_TYPE" == *"darwin"* ]]; then
    PLATFORM="bin-macos"
elif [[ "$OS_TYPE" == *"mingw"* || "$OS_TYPE" == *"cygwin"* || "$OS_TYPE" == *"msys"* ]]; then
    PLATFORM="bin-windows"
fi

if [[ "$(uname -m)" == *"arm"* || "$(uname -m)" == *"aarch64"* ]]; then
    ARCH="arm64"
fi

PLAYIT_BIN="config/playit"

if [ -f "$PLAYIT_BIN" ] || [ -f "${PLAYIT_BIN}.exe" ]; then
    echo "[Playit Helper] Playit binary already exists."
    exit 0
fi

# Fetch late release download url for playit binary agent
echo "[Playit Helper] Downloading latest standalone Playit release..."
PLAYIT_URL=$(curl -s https://api.github.com/repos/playit-cloud/playit-agent/releases/latest | jq -r --arg plat "$PLATFORM" --arg arch "$ARCH" '.assets[] | select(.name | contains($plat)) | select(.name | contains($arch)) | .browser_download_url' | head -n 1)

if [ -z "$PLAYIT_URL" ] || [ "$PLAYIT_URL" == "null" ]; then
    # Fallback to direct well-known link if release API rate limited or has different platform naming
    PLAYIT_URL="https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-amd64"
    if [[ "$PLATFORM" == "bin-windows" ]]; then
        PLAYIT_URL="https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-windows-amd64.exe"
    elif [[ "$PLATFORM" == "bin-macos" ]]; then
        PLAYIT_URL="https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-macos-amd64"
    fi
fi

echo "[Playit Helper] Downloading binary from $PLAYIT_URL"
mkdir -p config
if [[ "$PLATFORM" == "bin-windows" ]]; then
    curl -Lo "${PLAYIT_BIN}.exe" "$PLAYIT_URL"
    chmod +x "${PLAYIT_BIN}.exe"
else
    curl -Lo "$PLAYIT_BIN" "$PLAYIT_URL"
    chmod +x "$PLAYIT_BIN"
fi

echo "[Playit Helper] Download finished."
