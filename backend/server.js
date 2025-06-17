
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const fs = require('fs');

// Import modular components
const WebSocketManager = require('./websocket');
const healthRoutes = require('./routes/health');
const cameraRoutes = require('./routes/cameras');
const streamRoutes = require('./routes/streams');
const webrtcRoutes = require('./routes/webrtc');
const { initializeSipRoutes } = require('./routes/sip');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database with proper path
const dbPath = path.join(dataDir, 'jericho.db');
console.log('Database path:', dbPath);

let db;
try {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    } else {
      console.log('Connected to SQLite database at:', dbPath);
    }
  });
} catch (error) {
  console.error('Failed to create database:', error);
  process.exit(1);
}

// Initialize database tables
db.serialize(() => {
  // Cameras table
  db.run(`CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Motion events table
  db.run(`CREATE TABLE IF NOT EXISTS motion_events (
    id INTEGER PRIMARY KEY,
    camera_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence REAL,
    snapshot_path TEXT,
    FOREIGN KEY (camera_id) REFERENCES cameras (id)
  )`);

  // Stream status table
  db.run(`CREATE TABLE IF NOT EXISTS stream_status (
    id INTEGER PRIMARY KEY,
    camera_id INTEGER,
    status TEXT DEFAULT 'stopped',
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (camera_id) REFERENCES cameras (id)
  )`);

  // Add WebRTC streams table
  db.run(`CREATE TABLE IF NOT EXISTS webrtc_streams (
    id INTEGER PRIMARY KEY,
    camera_id INTEGER,
    stream_url TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras (id)
  )`);
});

// Store active streams
const activeStreams = new Map();

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server);

// Make shared resources available to routes
app.set('db', db);
app.set('activeStreams', activeStreams);
app.set('clients', wsManager.clients);
app.set('wsManager', wsManager);

// Mount routes - Health routes MUST be mounted first and correctly
app.use('/api/health', healthRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/sip', initializeSipRoutes(db));

// Create HLS directory if it doesn't exist
const hlsDir = path.join(__dirname, 'hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir, { recursive: true });
  console.log('Created HLS directory:', hlsDir);
}

// Serve static HLS files
app.use('/hls', express.static(hlsDir));

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    activeStreams: activeStreams.size,
    connectedClients: wsManager.getClientsCount(),
    database: 'connected',
    freepbx: 'integrated'
  });
});

// Add a test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health/database',
      '/api/health/ffmpeg', 
      '/api/health/streams',
      '/api/health/test-rtsp',
      '/api/sip/config',
      '/api/sip/extensions'
    ]
  });
});

// Catch-all for API routes that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Jericho Security Backend Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections at /api/ws`);
  console.log(`FreePBX Integration API available at /api/sip`);
  console.log(`Health checks available at /api/health/*`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  
  // Stop all active streams
  for (const [cameraId, stream] of activeStreams) {
    stream.process.kill('SIGTERM');
  }
  
  // Close database
  if (db) {
    db.close();
  }
  
  // Close server
  server.close(() => {
    process.exit(0);
  });
});
