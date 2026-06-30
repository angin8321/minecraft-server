# MineSpace

MineSpace is a production-ready, modular, and lightweight Minecraft Java Server hosting platform designed specifically to run inside **GitHub Codespaces** with one-click setup.

## Features
- **All-in-One Web Panel:** Manage console, resource metrics (CPU/RAM/TPS), backup & restore, plugins/mods, and config files directly from the browser at `http://localhost:3000`.
- **Integrated Playit Tunneling:** Automatic Playit.gg agent setup to expose your server instantly to the internet without port forwarding.
- **Process Management & Recovery:** Node.js backend handles automatic recovery for both Minecraft and Playit processes, as well as terminal streaming to `xterm.js`.
- **Preconfigured Dev Container:** Dev Container automatically configures OpenJDK, Node.js, and dependencies on startup.

## How to Start
1. Create a Codespace or clone into a system with standard tools.
2. The server config installs automatically.
3. Run the start command:
```bash
./start.sh
```
4. Access the panel at `http://localhost:3000`.

## How Playit works
The integrated Node.js daemon fetches the official Playit binary, runs it as a background service, captures the console output, and automatically parses the claim link and address. It routes connections securely.

## Configuration
Customize properties in `config/config.json`.
- `SERVER_TYPE`: `paper`, `purpur`, `fabric`, `vanilla`
- `SERVER_VERSION`: Select details like `1.20.4`, `1.21`, etc.
- `RAM`: Server allocation (e.g. `4G`).
- `ONLINE_MODE`: True/False.

## Operations
- **Backup:** Executed via panel or `scripts/backup.sh`. Backups are saved under `backups/`.
- **Restore:** Select backup file via the web panel to restore.
- **Plugin/Mod Management:** Upload plugins (`plugins/` directory) and fabric mods (`mods/` directory) through the Web Panel.
