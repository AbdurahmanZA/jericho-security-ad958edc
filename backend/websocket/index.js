
const WebSocket = require('ws');

class WebSocketManager {
  constructor(server) {
    this.clients = new Set();
    this.webrtcConnections = new Map();
    this.server = server;
    
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
          console.log('WebSocket message received:', data.type, data.cameraId ? `for camera ${data.cameraId}` : '');
          
          // Handle stream control messages
          if (data.type === 'start_stream' && data.cameraId && data.rtspUrl) {
            this.handleStartStream(ws, data);
          } else if (data.type === 'stop_stream' && data.cameraId) {
            this.handleStopStream(ws, data);
          }
          // Handle WebRTC signaling messages
          else if (data.type === 'offer' && data.cameraId) {
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

  // Stream control handlers
  async handleStartStream(ws, data) {
    const { cameraId, rtspUrl } = data;
    console.log(`Starting stream for camera ${cameraId} with URL: ${rtspUrl}`);
    
    try {
      // Make internal API call to start the stream
      const fetch = require('node-fetch');
      const response = await fetch(`http://localhost:3001/api/streams/${cameraId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: rtspUrl })
      });

      if (response.ok) {
        console.log(`Stream started successfully for camera ${cameraId}`);
        this.broadcast({
          type: 'stream_status',
          cameraId: parseInt(cameraId),
          status: 'started',
          timestamp: new Date().toISOString()
        });
      } else {
        const error = await response.text();
        console.error(`Failed to start stream for camera ${cameraId}:`, error);
        this.broadcast({
          type: 'stream_error',
          cameraId: parseInt(cameraId),
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error starting stream for camera ${cameraId}:`, error);
      this.broadcast({
        type: 'stream_error',
        cameraId: parseInt(cameraId),
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleStopStream(ws, data) {
    const { cameraId } = data;
    console.log(`Stopping stream for camera ${cameraId}`);
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`http://localhost:3001/api/streams/${cameraId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log(`Stream stopped successfully for camera ${cameraId}`);
        this.broadcast({
          type: 'stream_status',
          cameraId: parseInt(cameraId),
          status: 'stopped',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error stopping stream for camera ${cameraId}:`, error);
    }
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
    console.log('Broadcasting message:', data.type, data.cameraId ? `for camera ${data.cameraId}` : '');
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
