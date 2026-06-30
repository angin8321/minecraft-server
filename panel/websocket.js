/**
 * websocket.js - Handles WS communication for real-time console logs and statistics stream.
 */

const { WebSocketServer } = require('ws');

// Store all active client sockets
let activeSockets = [];

/**
 * Initializes the WebSocket server and binds connection events.
 * @param {Object} server - HTTP Server instance
 * @param {Object} processManager - The Minecraft and Playit active process manager
 */
function initWebSocket(server, processManager) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    activeSockets.push(ws);

    // Promptly send current status details
    const currentStatus = processManager.getStatus();
    ws.send(JSON.stringify({ type: 'status', data: currentStatus }));

    // Send buffered console history to client
    const bufferedLogs = processManager.getSystemLogBuffer();
    ws.send(JSON.stringify({ type: 'history', data: bufferedLogs }));

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message);
        if (payload.type === 'command' && payload.data) {
          processManager.sendMinecraftCommand(payload.data);
        }
      } catch (err) {
        console.error('[Websocket API] Failed parsing incoming socket statement:', err);
      }
    });

    ws.on('close', () => {
      activeSockets = activeSockets.filter(s => s !== ws);
    });
  });

  // Schedule resource monitoring broadcast every 2.5 seconds
  setInterval(() => {
    broadcast({
      type: 'stats',
      data: processManager.getSystemMetrics()
    });
    // Also periodic status update
    broadcast({
      type: 'status',
      data: processManager.getStatus()
    });
  }, 2500);

  // Hook process logs to clients
  processManager.onLog((line) => {
    broadcast({
      type: 'log',
      data: line
    });
  });
}

/**
 * Broadcasts an object payload to all connected clients.
 * @param {Object} payload 
 */
function broadcast(payload) {
  const rawMsg = JSON.stringify(payload);
  activeSockets.forEach((ws) => {
    if (ws.readyState === 1) { // OPEN
      ws.send(rawMsg);
    }
  });
}

module.exports = { initWebSocket, broadcast };
