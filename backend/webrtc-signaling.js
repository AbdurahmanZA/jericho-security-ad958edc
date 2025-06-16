
const WebSocket = require('ws');

class WebRTCSignalingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/api/ws'
    });
    
    this.clients = new Map();
    this.rooms = new Map();
    
    this.wss.on('connection', (ws, req) => {
      console.log('WebRTC signaling client connected');
      
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Invalid WebRTC message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('WebRTC signaling client disconnected');
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        console.error('WebRTC signaling error:', error);
        this.clients.delete(clientId);
      });
    });
  }
  
  generateClientId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
      case 'offer':
        this.handleOffer(clientId, message);
        break;
      case 'answer':
        this.handleAnswer(clientId, message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(clientId, message);
        break;
      case 'join-room':
        this.handleJoinRoom(clientId, message);
        break;
    }
  }
  
  handleOffer(clientId, message) {
    console.log(`Received offer from client ${clientId} for camera ${message.cameraId}`);
    
    // For now, send a mock answer - in production this would go through go2rtc
    const answer = {
      type: 'answer',
      cameraId: message.cameraId,
      sdp: this.generateMockAnswer(message.sdp)
    };
    
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(answer));
    }
  }
  
  handleAnswer(clientId, message) {
    console.log(`Received answer from client ${clientId}`);
  }
  
  handleIceCandidate(clientId, message) {
    console.log(`Received ICE candidate from client ${clientId}`);
  }
  
  handleJoinRoom(clientId, message) {
    console.log(`Client ${clientId} joining room for camera ${message.cameraId}`);
  }
  
  generateMockAnswer(offerSdp) {
    // This is a simplified mock answer - in production use proper SDP generation
    return offerSdp.replace('offer', 'answer').replace(/a=sendonly/g, 'a=recvonly');
  }
}

module.exports = WebRTCSignalingServer;
