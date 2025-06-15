// JERICHO Security System Backend Server (copied from install script)

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const AsteriskManager = require('./asterisk-manager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = 3001;
const HLS_DIR = path.resolve(__dirname, 'hls');
const SNAPSHOTS_DIR = path.resolve(__dirname, 'snapshots');

// Create directories
[HLS_DIR, SNAPSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Database setup
const db = new sqlite3.Database(path.resolve(__dirname, 'jericho.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY,
    name TEXT,
    url TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS motion_events (
    id INTEGER PRIMARY KEY,
    camera_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    snapshot_path TEXT,
    FOREIGN KEY(camera_id) REFERENCES cameras(id)
  )`);
});

// Initialize Asterisk Manager
const asteriskManager = new AsteriskManager(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/hls', express.static(HLS_DIR));
app.use('/snapshots', express.static(SNAPSHOTS_DIR));

// Active streams tracking
const activeStreams = new Map();
const connectedClients = new Set();

// Stream type detection and configuration
function detectStreamType(rtspUrl) {
  const url = rtspUrl.toLowerCase();
  
  if (url.includes('hikvision') || url.includes('hik') || 
      url.includes('/streaming/channels/') || url.includes('hikivision')) {
    return 'hikvision';
  }
  if (url.includes('dahua') || url.includes('/cam/realmonitor')) {
    return 'dahua';
  }
  if (url.includes('axis') || url.includes('/axis-media/')) {
    return 'axis';
  }
  if (url.includes('reolink') || url.includes('/h264preview_')) {
    return 'reolink';
  }
  if (url.includes('amcrest') || url.includes('/cam/realmonitor')) {
    return 'amcrest';
  }
  if (url.includes('ubiquiti') || url.includes('unifi')) {
    return 'ubiquiti';
  }
  
  return 'generic';
}

function getFFmpegParams(streamType, rtspUrl, outputPath) {
  const baseParams = [
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-f', 'hls',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency'
  ];

  let specificParams = [];

  switch (streamType) {
    case 'hikvision':
      specificParams = [
        '-hls_time', '4',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '960x576',
        '-r', '12',
        '-b:v', '600k',
        '-maxrate', '800k',
        '-bufsize', '1600k',
        '-g', '24',
        '-async', '1',
        '-vsync', '1',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts+discardcorrupt',
        '-analyzeduration', '2000000',
        '-probesize', '2000000'
      ];
      break;

    case 'dahua':
      specificParams = [
        '-hls_time', '3',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1280x720',
        '-r', '15',
        '-b:v', '800k',
        '-maxrate', '1000k',
        '-bufsize', '2000k',
        '-g', '30',
        '-async', '1',
        '-vsync', '1',
        '-avoid_negative_ts', 'make_zero'
      ];
      break;

    case 'axis':
      specificParams = [
        '-hls_time', '2',
        '-hls_list_size', '4',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1920x1080',
        '-r', '20',
        '-b:v', '1200k',
        '-maxrate', '1500k',
        '-bufsize', '3000k',
        '-g', '40'
      ];
      break;

    case 'reolink':
      specificParams = [
        '-hls_time', '3',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1920x1080',
        '-r', '15',
        '-b:v', '1000k',
        '-maxrate', '1200k',
        '-bufsize', '2400k',
        '-g', '30',
        '-async', '1'
      ];
      break;

    case 'amcrest':
      specificParams = [
        '-hls_time', '4',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1280x720',
        '-r', '15',
        '-b:v', '700k',
        '-maxrate', '900k',
        '-bufsize', '1800k',
        '-g', '30'
      ];
      break;

    case 'ubiquiti':
      specificParams = [
        '-hls_time', '2',
        '-hls_list_size', '4',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1920x1080',
        '-r', '30',
        '-b:v', '1500k',
        '-maxrate', '2000k',
        '-bufsize', '4000k',
        '-g', '60'
      ];
      break;

    default: // generic
      specificParams = [
        '-hls_time', '3',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '1280x720',
        '-r', '15',
        '-b:v', '800k',
        '-maxrate', '1000k',
        '-bufsize', '2000k',
        '-g', '30',
        '-async', '1',
        '-vsync', '1'
      ];
  }

  return [...baseParams, ...specificParams, outputPath];
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  connectedClients.add(ws);

  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Backend server connected',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);

      switch(data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'start_stream':
          startRTSPStream(data.cameraId, data.rtspUrl);
          break;
        case 'stop_stream':
          stopRTSPStream(data.cameraId);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    connectedClients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// RTSP Stream Management
function startRTSPStream(cameraId, rtspUrl) {
  if (activeStreams.has(cameraId)) {
    console.log(`Stream ${cameraId} already active`);
    return;
  }

  const streamType = detectStreamType(rtspUrl);
  console.log(`Starting RTSP stream for camera ${cameraId} (${streamType}): ${rtspUrl}`);

  const outputPath = path.join(HLS_DIR, `camera_${cameraId}.m3u8`);
  const ffmpegParams = getFFmpegParams(streamType, rtspUrl, outputPath);

  const ffmpeg = spawn('ffmpeg', ffmpegParams);

  ffmpeg.on('spawn', () => {
    console.log(`FFmpeg process started for camera ${cameraId} with ${streamType} optimizations`);
    activeStreams.set(cameraId, ffmpeg);

    broadcast({
      type: 'stream_status',
      cameraId: cameraId,
      status: 'started',
      streamType: streamType,
      hlsUrl: `/hls/camera_${cameraId}.m3u8`,
      timestamp: new Date().toISOString()
    });
  });

  ffmpeg.on('error', (error) => {
    console.error(`FFmpeg error for camera ${cameraId}:`, error);
    activeStreams.delete(cameraId);

    broadcast({
      type: 'stream_error',
      cameraId: cameraId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  ffmpeg.on('exit', (code) => {
    console.log(`FFmpeg process exited for camera ${cameraId} with code ${code}`);
    activeStreams.delete(cameraId);

    broadcast({
      type: 'stream_status',
      cameraId: cameraId,
      status: 'stopped',
      timestamp: new Date().toISOString()
    });
  });

  ffmpeg.stderr.on('data', (data) => {
    const output = data.toString();
    // Log important FFmpeg output for debugging
    if (output.includes('Stream mapping') || output.includes('Input #0') || output.includes('fps=')) {
      console.log(`FFmpeg info for camera ${cameraId} (${streamType}):`, output.trim());
    }
    if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
      console.error(`FFmpeg stderr for camera ${cameraId}:`, output);
    }
  });
}

function stopRTSPStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (stream) {
    console.log(`Stopping RTSP stream for camera ${cameraId}`);
    stream.kill('SIGTERM');
    activeStreams.delete(cameraId);
  }
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    activeStreams: Array.from(activeStreams.keys()),
    connectedClients: connectedClients.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// New endpoint for backend logs
app.get('/api/logs', (req, res) => {
  // Return recent logs - in a real implementation, you might store these in a database or file
  const recentLogs = [
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [INFO] Backend server running on port ${PORT}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [STATUS] Active streams: ${activeStreams.size}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [STATUS] Connected clients: ${connectedClients.size}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [SYSTEM] Server uptime: ${Math.floor(process.uptime())} seconds`
  ];
  res.json(recentLogs);
});

app.get('/api/cameras', (req, res) => {
  db.all('SELECT * FROM cameras ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/cameras', (req, res) => {
  const { name, url } = req.body;
  db.run('INSERT INTO cameras (name, url) VALUES (?, ?)', [name, url], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, url });
  });
});

app.post('/api/cameras/:id/test', (req, res) => {
  const cameraId = req.params.id;

  // Test RTSP connection with timeout
  const testProcess = spawn('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-timeout', '10000000',
    req.body.url
  ]);

  let output = '';
  testProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const info = JSON.parse(output);
        res.json({
          success: true,
          message: 'RTSP connection successful',
          streams: info.streams
        });
      } catch (e) {
        res.json({ success: true, message: 'RTSP connection successful' });
      }
    } else {
      res.json({
        success: false,
        message: 'RTSP connection failed',
        code: code
      });
    }
  });

  setTimeout(() => {
    testProcess.kill('SIGTERM');
    res.json({ success: false, message: 'Connection test timeout' });
  }, 15000);
});

app.post('/api/cameras/:id/snapshot', (req, res) => {
  const cameraId = req.params.id;
  const { rtspUrl } = req.body;
  const filename = `snapshot_${cameraId}_${Date.now()}.jpg`;
  const outputPath = path.join(SNAPSHOTS_DIR, filename);

  const ffmpeg = spawn('ffmpeg', [
    '-i', rtspUrl,
    '-frames:v', '1',
    '-q:v', '2',
    '-s', '640x480',
    outputPath
  ]);

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      res.json({
        success: true,
        filename: filename,
        url: `/snapshots/${filename}`
      });

      broadcast({
        type: 'snapshot_taken',
        cameraId: cameraId,
        filename: filename,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ success: false, message: 'Snapshot failed' });
    }
  });
});

// =================== ASTERISK/SIP API ENDPOINTS ===================

// Get SIP configuration
app.get('/api/sip/config', async (req, res) => {
  try {
    const config = await asteriskManager.getSipConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update SIP configuration
app.put('/api/sip/config', async (req, res) => {
  try {
    const config = await asteriskManager.updateSipConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all SIP extensions
app.get('/api/sip/extensions', async (req, res) => {
  try {
    const extensions = await asteriskManager.getExtensions();
    res.json(extensions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new SIP extension
app.post('/api/sip/extensions', async (req, res) => {
  try {
    const extension = await asteriskManager.createExtension(req.body);
    
    // Reload Asterisk if it's running
    if (req.body.reloadAsterisk !== false) {
      try {
        await asteriskManager.reloadAsterisk();
      } catch (reloadError) {
        console.warn('Could not reload Asterisk:', reloadError.message);
      }
    }
    
    broadcast({
      type: 'sip_extension_created',
      extension: extension,
      timestamp: new Date().toISOString()
    });
    
    res.json(extension);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update SIP extension
app.put('/api/sip/extensions/:id', async (req, res) => {
  try {
    const extension = await asteriskManager.updateExtension(req.params.id, req.body);
    
    // Reload Asterisk if it's running
    if (req.body.reloadAsterisk !== false) {
      try {
        await asteriskManager.reloadAsterisk();
      } catch (reloadError) {
        console.warn('Could not reload Asterisk:', reloadError.message);
      }
    }
    
    broadcast({
      type: 'sip_extension_updated',
      extension: extension,
      timestamp: new Date().toISOString()
    });
    
    res.json(extension);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete SIP extension
app.delete('/api/sip/extensions/:id', async (req, res) => {
  try {
    const result = await asteriskManager.deleteExtension(req.params.id);
    
    // Reload Asterisk if it's running
    try {
      await asteriskManager.reloadAsterisk();
    } catch (reloadError) {
      console.warn('Could not reload Asterisk:', reloadError.message);
    }
    
    broadcast({
      type: 'sip_extension_deleted',
      extensionId: req.params.id,
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Asterisk
app.post('/api/sip/start', async (req, res) => {
  try {
    const result = await asteriskManager.startAsterisk();
    
    broadcast({
      type: 'asterisk_status',
      status: 'started',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop Asterisk
app.post('/api/sip/stop', async (req, res) => {
  try {
    const result = await asteriskManager.stopAsterisk();
    
    broadcast({
      type: 'asterisk_status',
      status: 'stopped',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Asterisk status
app.get('/api/sip/status', async (req, res) => {
  try {
    const status = await asteriskManager.getAsteriskStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reload Asterisk configuration
app.post('/api/sip/reload', async (req, res) => {
  try {
    const result = await asteriskManager.reloadAsterisk();
    
    broadcast({
      type: 'asterisk_reloaded',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SIP peers (registered extensions)
app.get('/api/sip/peers', async (req, res) => {
  try {
    const peers = await asteriskManager.getSipPeers();
    res.json(peers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Asterisk configuration files
app.post('/api/sip/generate-config', async (req, res) => {
  try {
    const configs = await asteriskManager.generateAsteriskConfig();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced logging function
function logToClients(level, message) {
  const logEntry = {
    type: 'log',
    level: level,
    message: `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [${level}] ${message}`,
    timestamp: new Date().toISOString()
  };
  
  broadcast(logEntry);
  console.log(logEntry.message);
}

// Update existing console.log statements to use the new logging function
const originalConsoleLog = console.log;
console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  const message = args.join(' ');
  if (message.includes('JERICHO') || message.includes('FFmpeg') || message.includes('RTSP') || message.includes('Client')) {
    broadcast({
      type: 'log',
      message: `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [INFO] ${message}`,
      timestamp: new Date().toISOString()
    });
  }
};

// Start server
server.listen(PORT, () => {
  console.log(`JERICHO Backend Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`HLS streams available at: http://localhost:${PORT}/hls/`);
  console.log(`Snapshots available at: http://localhost:${PORT}/snapshots/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  activeStreams.forEach((stream, cameraId) => {
    stopRTSPStream(cameraId);
  });
  db.close();
  server.close();
});
