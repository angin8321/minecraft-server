/**
 * app.js - Web panel operations: WebSockets interface, tab toggling, file editing, API calls, and console logs.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  let currentFileDirectory = '';
  let socket = null;
  let term = null;

  // Initialize terminal UI
  function initTerminal() {
    term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#f8fafc'
      },
      fontFamily: 'monospace',
      fontSize: 13,
      rows: 24,
      cols: 80
    });
    term.open(document.getElementById('terminal'));
    term.writeln('\x1b[1;36m*** Connecting to MineSpace Panel WebSocket... ***\x1b[0m');
  }

  // Connect to workspace Live WS Console
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;
    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      term.clear();
      term.writeln('\x1b[1;32m*** Connected to MineSpace daemon ***\x1b[0m\r\n');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') {
          term.writeln(payload.data);
        } else if (payload.type === 'history') {
          term.clear();
          payload.data.forEach((line) => term.writeln(line));
        } else if (payload.type === 'status') {
          updatePanelStatuses(payload.data);
        } else if (payload.type === 'stats') {
          updateSystemMetrics(payload.data);
        }
      } catch (err) {
        console.error('Failed processing server payload:', err);
      }
    };

    socket.onclose = () => {
      term.writeln('\r\n\x1b[1;31m*** WebSocket disconnected. Reconnecting in 5s... ***\x1b[0m');
      setTimeout(connectWebSocket, 5000);
    };
  }

  // Bind side menu tab shifts
  const navButtons = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');

      // Trigger sub view actions
      if (tabTarget === 'plugins-mods') {
        loadPlugins();
        loadMods();
      } else if (tabTarget === 'filemanager') {
        loadFileDirectory(currentFileDirectory);
      } else if (tabTarget === 'backups') {
        loadBackups();
      } else if (tabTarget === 'configuration') {
        loadConfigForm();
      }
    });
  });

  // Action listeners for Minecraft control buttons
  document.getElementById('btn-start').addEventListener('click', () => fetch('/api/server/start', { method: 'POST' }));
  document.getElementById('btn-stop').addEventListener('click', () => fetch('/api/server/stop', { method: 'POST' }));
  document.getElementById('btn-restart').addEventListener('click', () => fetch('/api/server/restart', { method: 'POST' }));

  // Console send inputs
  const consoleVal = document.getElementById('console-input');
  const sendCmd = () => {
    const val = consoleVal.value.trim();
    if (val && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'command', data: val }));
      consoleVal.value = '';
    }
  };

  document.getElementById('btn-send-cmd').addEventListener('click', sendCmd);
  consoleVal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCmd();
  });

  // Playit tunnels action API listeners
  document.getElementById('btn-playit-start').addEventListener('click', () => fetch('/api/playit/start', { method: 'POST' }));
  document.getElementById('btn-playit-stop').addEventListener('click', () => fetch('/api/playit/stop', { method: 'POST' }));

  // Helper stats displays
  function updatePanelStatuses(data) {
    // Left sidebar status tags
    document.getElementById('mc-status-text').textContent = data.minecraft.toUpperCase();
    document.getElementById('playit-status-text').textContent = data.playit.toUpperCase();

    // Playit tunnels info box
    const playitBadge = document.getElementById('playit-status-info');
    playitBadge.textContent = data.playit.toUpperCase();
    playitBadge.className = `badge ${data.playit === 'running' ? 'btn-success' : 'btn-danger'}`;

    document.getElementById('playit-address').textContent = data.playitTunnel || 'No tunnel configured';
    document.getElementById('playit-minecraft').textContent = data.playitMc || 'Waiting for address binding';

    const claimWrapper = document.getElementById('claim-url-wrapper');
    const claimLink = document.getElementById('playit-claim-link');
    if (data.playitClaim) {
      claimWrapper.style.display = 'block';
      claimLink.href = data.playitClaim;
      claimLink.textContent = data.playitClaim;
    } else {
      claimWrapper.style.display = 'none';
    }
  }

  function updateSystemMetrics(data) {
    document.getElementById('stat-cpu').textContent = `${data.cpu}%`;
    document.getElementById('stat-ram').textContent = `${data.ram}%`;
    document.getElementById('stat-tps').textContent = Number(data.tps).toFixed(2);
    document.getElementById('stat-players').textContent = `${data.onlinePlayers} / ${data.maxPlayers}`;
  }

  // --- Configuration ---
  function loadConfigForm() {
    fetch('/api/config')
      .then(res => res.json())
      .then(cfg => {
        document.getElementById('cfg-server-type').value = cfg.SERVER_TYPE || 'paper';
        document.getElementById('cfg-server-version').value = cfg.SERVER_VERSION || '1.20.4';
        document.getElementById('cfg-ram').value = cfg.RAM || '4G';
        document.getElementById('cfg-online-mode').value = String(cfg.ONLINE_MODE || 'false');
        document.getElementById('cfg-world-name').value = cfg.WORLD_NAME || 'world';
        document.getElementById('cfg-java-flags').value = cfg.JAVA_FLAGS || '';
      });
  }

  document.getElementById('config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      SERVER_TYPE: document.getElementById('cfg-server-type').value,
      SERVER_VERSION: document.getElementById('cfg-server-version').value,
      RAM: document.getElementById('cfg-ram').value,
      ONLINE_MODE: document.getElementById('cfg-online-mode').value === 'true',
      WORLD_NAME: document.getElementById('cfg-world-name').value,
      JAVA_FLAGS: document.getElementById('cfg-java-flags').value
    };

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async res => {
      if (res.ok) {
        alert('Server settings saved successfully! Restart the Minecraft server to apply changes.');
      } else {
        const err = await res.json();
        alert('Error saving configuration: ' + err.error);
      }
    });
  });

  document.getElementById('btn-trigger-update').addEventListener('click', () => {
    if (confirm('Are you sure you want to stop Minecraft server and update current jar setup? Any ongoing matches/servers will close.')) {
      fetch('/api/server/update', { method: 'POST' })
        .then(() => alert('Installation update process triggered. Monitor console buffer.'));
    }
  });

  // --- Plugins & Mods Manager ---
  function loadPlugins() {
    const list = document.getElementById('plugins-list');
    list.innerHTML = '<li>Loading jar plugins...</li>';

    fetch('/api/plugins/list')
      .then(res => res.json())
      .then(plugins => {
        list.innerHTML = '';
        if (plugins.length === 0) {
          list.innerHTML = '<li>No jar plugins uploaded yet.</li>';
          return;
        }

        plugins.forEach(p => {
          const sizeKb = Math.round(p.size / 1024);
          const li = document.createElement('li');
          li.innerHTML = `
            <div class="name-wrapper">
              <strong>${p.name}</strong>
              <span class="item-size">${sizeKb} KB</span>
            </div>
            <div class="actions">
              <button class="btn btn-sm ${p.enabled ? 'btn-danger' : 'btn-success'}" onclick="togglePlugin('${p.name}', ${p.enabled})">
                ${p.enabled ? 'Disable' : 'Enable'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deletePlugin('${p.name}')">Delete</button>
            </div>
          `;
          list.appendChild(li);
        });
      });
  }

  window.togglePlugin = (name, enabled) => {
    const endpoint = enabled ? '/api/plugins/disable' : '/api/plugins/enable';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(() => loadPlugins());
  };

  window.deletePlugin = (name) => {
    if (confirm(`Do you wish to delete '${name}' plugin permanently?`)) {
      fetch('/api/plugins/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      }).then(() => loadPlugins());
    }
  };

  // Upload Plugin
  document.getElementById('upload-plugin-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/plugins/upload');
    xhr.setRequestHeader('X-File-Name', file.name);
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        alert('Plugin jar uploaded successfully. Please restart/reload server to verify.');
        loadPlugins();
      } else {
        alert('Plugin upload failed: ' + xhr.responseText);
      }
    };
    xhr.send(file);
  });

  // Mods Helpers (Fabric/Minecraft Forge modules)
  function loadMods() {
    const list = document.getElementById('mods-list');
    list.innerHTML = '<li>Loading mods...</li>';

    fetch('/api/mods/list')
      .then(res => res.json())
      .then(mods => {
        list.innerHTML = '';
        if (mods.length === 0) {
          list.innerHTML = '<li>No mods found in directory.</li>';
          return;
        }

        mods.forEach(m => {
          const sizeKb = Math.round(m.size / 1024);
          const li = document.createElement('li');
          li.innerHTML = `
            <div class="name-wrapper">
              <strong>${m.name}</strong>
              <span class="item-size">${sizeKb} KB</span>
            </div>
            <div class="actions">
              <button class="btn btn-sm ${m.enabled ? 'btn-danger' : 'btn-success'}" onclick="toggleMod('${m.name}', ${m.enabled})">
                ${m.enabled ? 'Disable' : 'Enable'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteMod('${m.name}')">Delete</button>
            </div>
          `;
          list.appendChild(li);
        });
      });
  }

  window.toggleMod = (name, enabled) => {
    const endpoint = enabled ? '/api/mods/disable' : '/api/mods/enable';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(() => loadMods());
  };

  window.deleteMod = (name) => {
    if (confirm(`Do you wish to delete '${name}' mod permanently?`)) {
      fetch('/api/mods/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      }).then(() => loadMods());
    }
  };

  // Upload Mod
  document.getElementById('upload-mod-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/mods/upload');
    xhr.setRequestHeader('X-File-Name', file.name);
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        alert('Mod jar uploaded successfully. Please restart/reload server to verify.');
        loadMods();
      } else {
        alert('Mod upload failed: ' + xhr.responseText);
      }
    };
    xhr.send(file);
  });


  // --- File Manager Operations ---
  function loadFileDirectory(relPath) {
    currentFileDirectory = relPath;
    document.getElementById('current-dir-label').textContent = '/' + relPath;

    fetch(`/api/files/list?path=${encodeURIComponent(relPath)}`)
      .then(res => res.json())
      .then(data => {
        const tbody = document.getElementById('files-table-body');
        tbody.innerHTML = '';

        if (!data.files || data.files.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">Empty directory.</td></tr>';
          return;
        }

        data.files.forEach(f => {
          const row = document.createElement('tr');
          const dateStr = new Date(f.modified).toLocaleString();
          
          let fileClass = 'file-item-file';
          let actions = '';

          if (f.isDirectory) {
            fileClass = 'file-item-dir';
            actions = `<button class="btn btn-secondary btn-sm" onclick="navigateToFolder('${f.name}')">Open</button>`;
          } else {
            // Check if file is editable text
            const editableExts = ['.properties', '.yml', '.json', '.txt', '.log', '.conf'];
            const isEditable = editableExts.some(ext => f.name.endsWith(ext)) || ['server.properties', 'spigot.yml', 'bukkit.yml', 'paper.yml'].includes(f.name);
            if (isEditable) {
              actions = `<button class="btn btn-primary btn-sm" onclick="editConfigTextFile('${f.name}')">Edit</button>`;
            } else {
              actions = `<span class="item-size">Bin</span>`;
            }
          }

          row.innerHTML = `
            <td><span class="${fileClass}">${f.name}</span></td>
            <td>${f.isDirectory ? '-' : Math.round(f.size / 1024) + ' KB'}</td>
            <td>${dateStr}</td>
            <td>${actions}</td>
          `;
          tbody.appendChild(row);
        });
      });
  }

  window.navigateToFolder = (folderName) => {
    const suffix = currentFileDirectory ? '/' : '';
    loadFileDirectory(currentFileDirectory + suffix + folderName);
  };

  document.getElementById('btn-file-up').addEventListener('click', () => {
    if (!currentFileDirectory) return;
    const parts = currentFileDirectory.split('/');
    parts.pop();
    loadFileDirectory(parts.join('/'));
  });

  window.editConfigTextFile = (fileName) => {
    const suffix = currentFileDirectory ? '/' : '';
    const fullPath = currentFileDirectory + suffix + fileName;

    fetch(`/api/files/view?path=${encodeURIComponent(fullPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert('Could not view file: ' + data.error);
          return;
        }
        document.getElementById('editor-file-title').textContent = 'Editing: ' + fullPath;
        document.getElementById('editor-file-title').setAttribute('data-target-path', fullPath);
        document.getElementById('file-editor-content').value = data.contents;
        document.getElementById('file-editor-box').style.display = 'block';
      });
  };

  document.getElementById('btn-close-editor').addEventListener('click', () => {
    document.getElementById('file-editor-box').style.display = 'none';
  });

  document.getElementById('btn-save-file').addEventListener('click', () => {
    const fullPath = document.getElementById('editor-file-title').getAttribute('data-target-path');
    const updatedContent = document.getElementById('file-editor-content').value;

    fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: fullPath, content: updatedContent })
    })
    .then(async res => {
      if (res.ok) {
        alert('File saved successfully.');
        document.getElementById('file-editor-box').style.display = 'none';
        loadFileDirectory(currentFileDirectory);
      } else {
        const err = await res.json();
        alert('Failed saving: ' + err.error);
      }
    });
  });

  // --- Backup REST Operations ---
  function loadBackups() {
    fetch('/api/backups')
      .then(res => res.json())
      .then(backups => {
        const tbody = document.getElementById('backups-table-body');
        tbody.innerHTML = '';
        if (backups.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4">No zip backup records exist.</td></tr>';
          return;
        }

        backups.forEach(b => {
          const row = document.createElement('tr');
          const sizeMb = (b.size / (1024 * 1024)).toFixed(2);
          const dateStr = new Date(b.created).toLocaleString();

          row.innerHTML = `
            <td><strong>${b.name}</strong></td>
            <td>${sizeMb} MB</td>
            <td>${dateStr}</td>
            <td>
              <button class="btn btn-warning btn-sm" onclick="restoreBackupArchive('${b.name}')">Restore</button>
              <a href="/api/backups/download/${b.name}" class="btn btn-primary btn-sm">Download</a>
            </td>
          `;
          tbody.appendChild(row);
        });
      });
  }

  document.getElementById('btn-create-backup').addEventListener('click', () => {
    if (confirm('Create new backup ZIP of the worlds and plugin configurations?')) {
      fetch('/api/backups/create', { method: 'POST' })
        .then(async res => {
          if (res.ok) {
            alert('Backup created successfully!');
            loadBackups();
          } else {
            const err = await res.json();
            alert('Backup failed: ' + err.error);
          }
        });
    }
  });

  window.restoreBackupArchive = (name) => {
    if (confirm(`WARING: Restoring backup '${name}' will close the server and overwrite files in the directory. Continue?`)) {
      fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: name })
      })
      .then(async res => {
        if (res.ok) {
          alert('Backup restoration triggers complete. Check control panel stats.');
          loadBackups();
        } else {
          const err = await res.json();
          alert('Restore failed: ' + err.error);
        }
      });
    }
  };

  // Main UI Initialization
  initTerminal();
  connectWebSocket();
});
