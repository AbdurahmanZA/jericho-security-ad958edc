
const WebSocket = require('ws');

class WebSocketManager {
  constructor(server) {
    this.clients = new Set();
    this.webrtcConnections = new Map();
    
    // Create a single WebSocket server to avoid conflicts
    this.wss = new WebSocket.Server({ 
      server,
      path: '/api/ws'
    });

    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle WebRTC signaling messages
          if (data.type === 'offer' && data.cameraId) {
            console.log(`WebRTC offer received for camera ${data.cameraId}`);
            this.handleWebRTCOffer(ws, data);
          } else if (data.type === 'ice-candidate' && data.cameraId) {
            console.log(`ICE candidate received for camera ${data.cameraId}`);
            this.handleICECandidate(ws, data);
          } else if (data.type === 'answer' && data.cameraId) {
            console.log(`WebRTC answer received for camera ${data.cameraId}`);
            this.handleWebRTCAnswer(ws, data);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
        
        // Clean up any WebRTC connections for this client
        for (const [key, connection] of this.webrtcConnections) {
          if (connection.ws === ws) {
            this.webrtcConnections.delete(key);
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial status
      ws.send(JSON.stringify({
        type: 'connection_status',
        status: 'connected',
        timestamp: new Date().toISOString()
      }));
    });
  }

  // WebRTC signaling handlers
  handleWebRTCOffer(ws, data) {
    const { cameraId, sdp } = data;
    
    // Store the WebRTC connection
    this.webrtcConnections.set(`${cameraId}-${Date.now()}`, {
      ws,
      cameraId,
      type: 'offer'
    });
    
    // For now, send back a simple response
    // In a full implementation, this would interface with a media server
    ws.send(JSON.stringify({
      type: 'webrtc_response',
      cameraId,
      message: 'Offer received, WebRTC signaling ready'
    }));
  }

  handleICECandidate(ws, data) {
    const { cameraId, candidate } = data;
    console.log(`ICE candidate for camera ${cameraId}:`, candidate);
  }

  handleWebRTCAnswer(ws, data) {
    const { cameraId, sdp } = data;
    console.log(`WebRTC answer for camera ${cameraId}`);
  }

  // Broadcast to all connected clients
  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getClientsCount() {
    return this.clients.size;
  }
}

module.exports = WebSocketManager;
