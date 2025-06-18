const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const WebRTCSignalingServer = require('./webrtc-signaling');

// Import route modules
const { initializeSipRoutes } = require('./routes/sip');

const app = express();
const server = http.createServer(app);

// Create multiple WebSocket servers for different purposes
const wss = new WebSocket.Server({ server, path: '/ws' });
const jsmpegWss = new WebSocket.Server({ server, path: '/jsmpeg' });

// Initialize WebRTC signaling server
const webrtcSignaling = new WebRTCSignalingServer(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static HLS files
app.use('/hls', express.static(path.join(__dirname, 'hls')));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'jericho.db');
const db = new sqlite3.Database(dbPath);

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

// Store active streams and WebSocket connections
const activeStreams = new Map();
const hlsStreams = new Map();
const jsmpegStreams = new Map();
const clients = new Set();
const jsmpegClients = new Map(); // Map camera ID to WebSocket clients

// WebSocket connection handling for general communication
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  clients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Send initial status
  ws.send(JSON.stringify({
    type: 'connection_status',
    status: 'connected',
    timestamp: new Date().toISOString()
  }));
});

// JSMpeg WebSocket handling for video streaming
jsmpegWss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cameraId = parseInt(url.pathname.split('/').pop());
  
  if (!cameraId || isNaN(cameraId)) {
    ws.close(1008, 'Invalid camera ID');
    return;
  }

  console.log(`JSMpeg client connected for camera ${cameraId}`);
  
  if (!jsmpegClients.has(cameraId)) {
    jsmpegClients.set(cameraId, new Set());
  }
  jsmpegClients.get(cameraId).add(ws);

  ws.on('close', () => {
    console.log(`JSMpeg client disconnected for camera ${cameraId}`);
    const clients = jsmpegClients.get(cameraId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        jsmpegClients.delete(cameraId);
        // Stop JSMpeg stream if no clients
        stopJSMpegStream(cameraId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`JSMpeg WebSocket error for camera ${cameraId}:`, error);
  });

  // Start JSMpeg stream if not already running
  if (!jsmpegStreams.has(cameraId)) {
    startJSMpegStream(cameraId);
  }
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast JSMpeg data to specific camera clients
function broadcastJSMpeg(cameraId, data) {
  const clients = jsmpegClients.get(cameraId);
  if (clients) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

// Start JSMpeg stream for a camera
function startJSMpegStream(cameraId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
      if (err || !camera) {
        reject(new Error('Camera not found'));
        return;
      }

      console.log(`Starting JSMpeg stream for camera ${cameraId}`);

      const ffmpegArgs = [
        '-i', camera.url,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-codec:a', 'mp2',
        '-b:v', '1000k',
        '-bf', '0',
        '-muxdelay', '0.001',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-strict', '-1',
        '-y',
        'pipe:1'
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      jsmpegStreams.set(cameraId, ffmpeg);

      ffmpeg.stdout.on('data', (data) => {
        broadcastJSMpeg(cameraId, data);
      });

      ffmpeg.stderr.on('data', (data) => {
        console.log(`JSMpeg FFmpeg stderr: ${data}`);
      });

      ffmpeg.on('spawn', () => {
        console.log(`JSMpeg stream started for camera ${cameraId}`);
        resolve(true);
      });

      ffmpeg.on('error', (error) => {
        console.error(`JSMpeg stream error for camera ${cameraId}:`, error);
        jsmpegStreams.delete(cameraId);
        reject(error);
      });

      ffmpeg.on('exit', (code, signal) => {
        console.log(`JSMpeg stream ended for camera ${cameraId} (code: ${code}, signal: ${signal})`);
        jsmpegStreams.delete(cameraId);
      });
    });
  });
}

// Stop JSMpeg stream for a camera
function stopJSMpegStream(cameraId) {
  const stream = jsmpegStreams.get(cameraId);
  if (stream) {
    console.log(`Stopping JSMpeg stream for camera ${cameraId}`);
    stream.kill('SIGTERM');
    jsmpegStreams.delete(cameraId);
  }
}

// Initialize SIP routes
app.use('/api/sip', initializeSipRoutes(db));

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    activeStreams: activeStreams.size,
    connectedClients: clients.size,
    database: 'connected'
  });
});

// Cameras API
app.get('/api/cameras', (req, res) => {
  db.all('SELECT * FROM cameras ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

app.post('/api/cameras', (req, res) => {
  const { name, url, enabled = true } = req.body;
  
  db.run('INSERT INTO cameras (name, url, enabled) VALUES (?, ?, ?)',
    [name, url, enabled ? 1 : 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, url, enabled });
    }
  );
});

app.put('/api/cameras/:id', (req, res) => {
  const { name, url, enabled } = req.body;
  const id = req.params.id;
  
  db.run('UPDATE cameras SET name = ?, url = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, url, enabled ? 1 : 0, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, name, url, enabled });
    }
  );
});

app.delete('/api/cameras/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM cameras WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes > 0 });
  });
});

// Add WebRTC stream management
app.post('/api/webrtc/streams/:cameraId/start', (req, res) => {
  const cameraId = req.params.cameraId;
  
  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
    if (err || !camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    // Store WebRTC stream info
    db.run('INSERT OR REPLACE INTO webrtc_streams (camera_id, stream_url, enabled) VALUES (?, ?, ?)',
      [cameraId, camera.url, 1]);

    broadcast({
      type: 'webrtc_stream_ready',
      cameraId: parseInt(cameraId),
      timestamp: new Date().toISOString()
    });

    res.json({ 
      status: 'webrtc_ready', 
      cameraId: parseInt(cameraId),
      signaling_url: '/api/ws'
    });
  });
});

app.get('/api/webrtc/streams/:cameraId/status', (req, res) => {
  const cameraId = req.params.cameraId;
  
  db.get('SELECT * FROM webrtc_streams WHERE camera_id = ?', [cameraId], (err, stream) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      cameraId: parseInt(cameraId),
      webrtc_available: !!stream && stream.enabled,
      stream_url: stream?.stream_url || null
    });
  });
});

// Stream control
app.post('/api/streams/:cameraId/start', (req, res) => {
  const cameraId = req.params.cameraId;
  
  // Get camera details
  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, camera) => {
    if (err || !camera) {
      res.status(404).json({ error: 'Camera not found' });
      return;
    }

    // Start FFmpeg process for HLS
    const hlsPath = path.join(__dirname, 'hls', `camera_${cameraId}.m3u8`);
    const segmentPath = path.join(__dirname, 'hls', `camera_${cameraId}_%03d.ts`);
    
    // Ensure HLS directory exists
    const hlsDir = path.dirname(hlsPath);
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const ffmpegArgs = [
      '-i', camera.url,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments',
      '-y',
      hlsPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('spawn', () => {
      activeStreams.set(parseInt(cameraId), {
        process: ffmpeg,
        camera: camera,
        hlsPath: hlsPath,
        startTime: new Date()
      });

      // Update stream status
      db.run('INSERT OR REPLACE INTO stream_status (camera_id, status) VALUES (?, ?)',
        [cameraId, 'running']);

      broadcast({
        type: 'stream_started',
        cameraId: parseInt(cameraId),
        timestamp: new Date().toISOString()
      });

      res.json({ status: 'started', cameraId: parseInt(cameraId) });
    });

    ffmpeg.on('error', (error) => {
      console.error(`Stream error for camera ${cameraId}:`, error);
      activeStreams.delete(parseInt(cameraId));
      
      db.run('UPDATE stream_status SET status = ?, error_message = ? WHERE camera_id = ?',
        ['error', error.message, cameraId]);

      broadcast({
        type: 'stream_error',
        cameraId: parseInt(cameraId),
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    ffmpeg.on('exit', (code) => {
      console.log(`Stream ended for camera ${cameraId} with code ${code}`);
      activeStreams.delete(parseInt(cameraId));
      
      db.run('UPDATE stream_status SET status = ? WHERE camera_id = ?',
        ['stopped', cameraId]);

      broadcast({
        type: 'stream_stopped',
        cameraId: parseInt(cameraId),
        timestamp: new Date().toISOString()
      });
    });
  });
});

app.post('/api/streams/:cameraId/stop', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  const stream = activeStreams.get(cameraId);
  
  if (stream) {
    stream.process.kill('SIGTERM');
    activeStreams.delete(cameraId);
    
    db.run('UPDATE stream_status SET status = ? WHERE camera_id = ?',
      ['stopped', cameraId]);

    broadcast({
      type: 'stream_stopped',
      cameraId: cameraId,
      timestamp: new Date().toISOString()
    });

    res.json({ status: 'stopped', cameraId });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

// Get stream status
app.get('/api/streams/:cameraId/status', (req, res) => {
  const cameraId = req.params.cameraId;
  
  db.get('SELECT * FROM stream_status WHERE camera_id = ?', [cameraId], (err, status) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const isActive = activeStreams.has(parseInt(cameraId));
    res.json({
      cameraId: parseInt(cameraId),
      status: isActive ? 'running' : (status?.status || 'stopped'),
      lastUpdate: status?.last_update || null,
      errorMessage: status?.error_message || null
    });
  });
});

// Enhanced stream control with JSMpeg support
app.post('/api/streams/:cameraId/jsmpeg/start', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  
  startJSMpegStream(cameraId)
    .then(() => {
      res.json({ 
        status: 'started', 
        cameraId,
        streamType: 'jsmpeg',
        wsUrl: `/jsmpeg/${cameraId}`
      });
    })
    .catch(error => {
      res.status(500).json({ 
        error: error.message,
        cameraId,
        streamType: 'jsmpeg'
      });
    });
});

app.post('/api/streams/:cameraId/jsmpeg/stop', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  
  stopJSMpegStream(cameraId);
  
  res.json({ 
    status: 'stopped', 
    cameraId,
    streamType: 'jsmpeg'
  });
});

// Get JSMpeg stream status
app.get('/api/streams/:cameraId/jsmpeg/status', (req, res) => {
  const cameraId = parseInt(req.params.cameraId);
  const isActive = jsmpegStreams.has(cameraId);
  const clientCount = jsmpegClients.get(cameraId)?.size || 0;
  
  res.json({
    cameraId,
    streamType: 'jsmpeg',
    status: isActive ? 'running' : 'stopped',
    clientCount,
    wsUrl: `/jsmpeg/${cameraId}`
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Jericho Security Backend Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`JSMpeg WebSocket server ready on /jsmpeg/:cameraId`);
  console.log(`SIP/VoIP API available at /api/sip`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  
  // Stop all active streams
  for (const [cameraId, stream] of activeStreams) {
    stream.process.kill('SIGTERM');
  }
  
  // Close database
  db.close();
  
  // Close server
  server.close(() => {
    process.exit(0);
  });
});
