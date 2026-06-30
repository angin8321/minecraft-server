#!/bin/bash
# update.sh - Downloads and installs the requested Minecraft server version based on config.json

CONFIG_FILE="config/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found at $CONFIG_FILE"
    exit 1
fi

SERVER_TYPE=$(jq -r '.SERVER_TYPE' "$CONFIG_FILE")
SERVER_VERSION=$(jq -r '.SERVER_VERSION' "$CONFIG_FILE")

echo "[MineSpace Updater] Target settings parsed: $SERVER_TYPE version: $SERVER_VERSION"
mkdir -p server

# Create EULA file automatically
echo "eula=true" > server/eula.txt

case "$SERVER_TYPE" in
    paper)
        echo "[MineSpace Updater] Querying Paper MC API..."
        # Direct Paper API call
        LATEST_BUILD=$(curl -s https://api.papermc.io/v2/projects/paper/versions/${SERVER_VERSION} | jq '.builds[-1]')
        if [ "$LATEST_BUILD" = "null" ] || [ -z "$LATEST_BUILD" ]; then
            echo "[Error] Invalid version or build from Paper MC API."
            exit 1
        fi
        JAR_NAME="paper-${SERVER_VERSION}-${LATEST_BUILD}.jar"
        DOWNLOAD_URL="https://api.papermc.io/v2/projects/paper/versions/${SERVER_VERSION}/builds/${LATEST_BUILD}/downloads/${JAR_NAME}"
        echo "[MineSpace Updater] Downloading Paper build $LATEST_BUILD from $DOWNLOAD_URL ..."
        curl -o server/server.jar -L "$DOWNLOAD_URL"
        ;;
    purpur)
        echo "[MineSpace Updater] Querying Purpur API..."
        DOWNLOAD_URL="https://api.purpurmc.org/v2/purpur/${SERVER_VERSION}/latest/download"
        echo "[MineSpace Updater] Downloading Purpur from $DOWNLOAD_URL ..."
        curl -o server/server.jar -L "$DOWNLOAD_URL"
        ;;
    fabric)
        echo "[MineSpace Updater] Querying Fabric Meta API..."
        FABRIC_LOADER_VERSION=$(curl -s https://meta.fabricmc.net/v2/versions/loader | jq -r '.[0].version')
        FABRIC_INSTALLER_VERSION=$(curl -s https://meta.fabricmc.net/v2/versions/installer | jq -r '.[0].version')
        DOWNLOAD_URL="https://meta.fabricmc.net/v2/versions/loader/game/${SERVER_VERSION}/${FABRIC_LOADER_VERSION}/${FABRIC_INSTALLER_VERSION}/server/jar"
        echo "[MineSpace Updater] Downloading Fabric release from $DOWNLOAD_URL ..."
        curl -o server/server.jar -L "$DOWNLOAD_URL"
        ;;
    vanilla)
        echo "[MineSpace Updater] Fetching Vanilla Manifest..."
        MANIFEST_URL="https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
        VERSION_URL=$(curl -s "$MANIFEST_URL" | jq -r --arg ver "$SERVER_VERSION" '.versions[] | select(.id == $ver) | .url')
        if [ -z "$VERSION_URL" ]; then
            echo "[Error] Could not find vanilla game version manifest url."
            exit 1
        fi
        DOWNLOAD_URL=$(curl -s "$VERSION_URL" | jq -r '.downloads.server.url')
        echo "[MineSpace Updater] Downloading Vanilla Server from $DOWNLOAD_URL ..."
        curl -o server/server.jar -L "$DOWNLOAD_URL"
        ;;
    *)
        echo "[Error] Unknown SERVER_TYPE: $SERVER_TYPE. Choose paper, purpur, fabric, or vanilla."
        exit 1
        ;;
esac

if [ -f "server/server.jar" ]; then
    echo "[MineSpace Updater] Update complete. Java server executable saved as server/server.jar."
else
    echo "[Error] Download failed or file was not saved."
    exit 1
fi
