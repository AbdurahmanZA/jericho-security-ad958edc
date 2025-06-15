// JERICHO Security System Backend Server (Optimized for Performance)

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
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // Disable compression for better performance
  maxPayload: 16 * 1024 * 1024 // 16MB max payload
});

// Configuration
const PORT = process.env.PORT || 3001;
const HLS_DIR = path.resolve(__dirname, 'hls');
const SNAPSHOTS_DIR = path.resolve(__dirname, 'snapshots');
const MAX_CONCURRENT_STREAMS = process.env.MAX_STREAMS || 10;
const FFMPEG_TIMEOUT = 30000; // 30 seconds timeout for FFmpeg startup

// Create directories
[HLS_DIR, SNAPSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Database setup with connection pooling and optimization
const dbOptions = {
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  verbose: null // Disable verbose logging for performance
};

const db = new sqlite3.Database(path.resolve(__dirname, 'jericho.db'), dbOptions);

// Optimize database for performance
db.serialize(() => {
  // Enable WAL mode for better concurrent access
  db.run("PRAGMA journal_mode=WAL");
  db.run("PRAGMA synchronous=NORMAL");
  db.run("PRAGMA cache_size=10000");
  db.run("PRAGMA temp_store=memory");
  
  // Create tables with optimized indexes
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

  // Create indexes for better query performance
  db.run("CREATE INDEX IF NOT EXISTS idx_motion_events_camera_id ON motion_events(camera_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_motion_events_timestamp ON motion_events(timestamp)");
});

// Initialize Asterisk Manager
const asteriskManager = new AsteriskManager(db);

// Middleware with optimizations
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/hls', express.static(HLS_DIR, {
  maxAge: '1s', // Short cache for live streams
  etag: false
}));
app.use('/snapshots', express.static(SNAPSHOTS_DIR, {
  maxAge: '1h', // Longer cache for snapshots
  etag: true
}));

// Active streams tracking with enhanced management
class StreamManager {
  constructor() {
    this.activeStreams = new Map();
    this.streamStartTimes = new Map();
    this.streamStats = new Map();
  }

  add(cameraId, process) {
    const cameraIdStr = String(cameraId);
    this.activeStreams.set(cameraIdStr, process);
    this.streamStartTimes.set(cameraIdStr, Date.now());
    this.streamStats.set(cameraIdStr, { restarts: 0, errors: 0 });
  }

  get(cameraId) {
    return this.activeStreams.get(String(cameraId));
  }

  has(cameraId) {
    return this.activeStreams.has(String(cameraId));
  }

  delete(cameraId) {
    const cameraIdStr = String(cameraId);
    this.activeStreams.delete(cameraIdStr);
    this.streamStartTimes.delete(cameraIdStr);
    this.streamStats.delete(cameraIdStr);
  }

  size() {
    return this.activeStreams.size;
  }

  keys() {
    return Array.from(this.activeStreams.keys());
  }

  getStats(cameraId) {
    const cameraIdStr = String(cameraId);
    const startTime = this.streamStartTimes.get(cameraIdStr);
    const stats = this.streamStats.get(cameraIdStr) || { restarts: 0, errors: 0 };
    return {
      ...stats,
      uptime: startTime ? Date.now() - startTime : 0
    };
  }

  incrementError(cameraId) {
    const cameraIdStr = String(cameraId);
    const stats = this.streamStats.get(cameraIdStr) || { restarts: 0, errors: 0 };
    stats.errors++;
    this.streamStats.set(cameraIdStr, stats);
  }

  cleanup() {
    console.log('Cleaning up all streams...');
    for (const [cameraId, process] of this.activeStreams) {
      try {
        process.kill('SIGTERM');
        console.log(`Terminated stream for camera ${cameraId}`);
      } catch (error) {
        console.error(`Error terminating stream ${cameraId}:`, error.message);
      }
    }
    this.activeStreams.clear();
    this.streamStartTimes.clear();
    this.streamStats.clear();
  }
}

const streamManager = new StreamManager();

// WebSocket connection management with heartbeat
class WebSocketManager {
  constructor() {
    this.connectedClients = new Set();
    this.heartbeatInterval = 30000; // 30 seconds
    this.startHeartbeat();
  }

  add(ws) {
    this.connectedClients.add(ws);
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  remove(ws) {
    this.connectedClients.delete(ws);
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    let deadClients = [];
    
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('WebSocket send error:', error.message);
          deadClients.push(client);
        }
      } else {
        deadClients.push(client);
      }
    });

    // Clean up dead connections
    deadClients.forEach(client => this.remove(client));
  }

  startHeartbeat() {
    setInterval(() => {
      let deadClients = [];
      
      this.connectedClients.forEach(ws => {
        if (!ws.isAlive) {
          deadClients.push(ws);
          return;
        }
        
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          deadClients.push(ws);
        }
      });

      deadClients.forEach(client => {
        this.remove(client);
        try {
          client.terminate();
        } catch (error) {
          // Ignore termination errors
        }
      });
    }, this.heartbeatInterval);
  }

  size() {
    return this.connectedClients.size;
  }
}

const wsManager = new WebSocketManager();

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
    '-preset', 'veryfast', // Changed from ultrafast for better compression
    '-tune', 'zerolatency',
    '-threads', '2', // Limit CPU usage
    '-bufsize', '512k', // Smaller buffer for faster startup
    '-maxrate', '1M' // Global rate limit
  ];

  let specificParams = [];

  switch (streamType) {
    case 'hikvision':
      specificParams = [
        '-hls_time', '2', // Shorter segments for faster startup
        '-hls_list_size', '3', // Fewer segments in playlist
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '854x480', // Reduced resolution for performance
        '-r', '10', // Lower framerate
        '-b:v', '400k',
        '-g', '20'
      ];
      break;

    case 'dahua':
      specificParams = [
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '960x540',
        '-r', '12',
        '-b:v', '500k',
        '-g', '24'
      ];
      break;

    default: // generic and others
      specificParams = [
        '-hls_time', '2',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-s', '854x480',
        '-r', '10',
        '-b:v', '400k',
        '-g', '20'
      ];
  }

  return [...baseParams, ...specificParams, outputPath];
}

// Enhanced WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log(`Client connected from ${req.socket.remoteAddress}`);
  wsManager.add(ws);

  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Backend server connected',
    serverStats: {
      activeStreams: streamManager.size(),
      connectedClients: wsManager.size()
    },
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'start_stream':
          if (streamManager.size() >= MAX_CONCURRENT_STREAMS) {
            ws.send(JSON.stringify({
              type: 'stream_error',
              cameraId: data.cameraId,
              error: `Maximum concurrent streams (${MAX_CONCURRENT_STREAMS}) reached`,
              timestamp: new Date().toISOString()
            }));
          } else {
            startRTSPStream(data.cameraId, data.rtspUrl);
          }
          break;
        case 'stop_stream':
          stopRTSPStream(data.cameraId);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    wsManager.remove(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    wsManager.remove(ws);
  });
});

// Optimized RTSP Stream Management
function startRTSPStream(cameraId, rtspUrl) {
  const cameraIdStr = String(cameraId);
  
  if (streamManager.has(cameraIdStr)) {
    console.log(`Stream ${cameraIdStr} already active`);
    return;
  }

  const streamType = detectStreamType(rtspUrl);
  console.log(`Starting RTSP stream for camera ${cameraIdStr} (${streamType}): ${rtspUrl}`);

  const outputPath = path.join(HLS_DIR, `camera_${cameraIdStr}.m3u8`);
  const ffmpegParams = getFFmpegParams(streamType, rtspUrl, outputPath);

  const ffmpeg = spawn('ffmpeg', ffmpegParams, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  // Set up timeout for FFmpeg startup
  const startupTimeout = setTimeout(() => {
    console.error(`FFmpeg startup timeout for camera ${cameraIdStr}`);
    ffmpeg.kill('SIGKILL');
  }, FFMPEG_TIMEOUT);

  ffmpeg.on('spawn', () => {
    clearTimeout(startupTimeout);
    console.log(`FFmpeg process started for camera ${cameraIdStr} (PID: ${ffmpeg.pid})`);
    streamManager.add(cameraIdStr, ffmpeg);

    wsManager.broadcast({
      type: 'stream_status',
      cameraId: parseInt(cameraIdStr),
      status: 'started',
      streamType: streamType,
      hlsUrl: `/hls/camera_${cameraIdStr}.m3u8`,
      pid: ffmpeg.pid,
      timestamp: new Date().toISOString()
    });
  });

  ffmpeg.on('error', (error) => {
    clearTimeout(startupTimeout);
    console.error(`FFmpeg error for camera ${cameraIdStr}:`, error.message);
    streamManager.incrementError(cameraIdStr);
    streamManager.delete(cameraIdStr);

    wsManager.broadcast({
      type: 'stream_error',
      cameraId: parseInt(cameraIdStr),
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });

  ffmpeg.on('exit', (code, signal) => {
    clearTimeout(startupTimeout);
    console.log(`FFmpeg process exited for camera ${cameraIdStr} with code ${code}, signal ${signal}`);
    streamManager.delete(cameraIdStr);

    wsManager.broadcast({
      type: 'stream_status',
      cameraId: parseInt(cameraIdStr),
      status: 'stopped',
      exitCode: code,
      signal: signal,
      timestamp: new Date().toISOString()
    });
  });

  // Limit FFmpeg output logging to reduce memory usage
  let logBuffer = '';
  ffmpeg.stderr.on('data', (data) => {
    const output = data.toString();
    logBuffer += output;
    
    // Keep only last 1000 characters to prevent memory bloat
    if (logBuffer.length > 1000) {
      logBuffer = logBuffer.slice(-1000);
    }
    
    // Only log important messages
    if (output.includes('Stream mapping') || output.includes('fps=') || 
        output.includes('error') || output.includes('Error')) {
      console.log(`FFmpeg [${cameraIdStr}]:`, output.trim().slice(-200));
    }
  });
}

function stopRTSPStream(cameraId) {
  const cameraIdStr = String(cameraId);
  const stream = streamManager.get(cameraIdStr);
  if (stream) {
    console.log(`Stopping RTSP stream for camera ${cameraIdStr}`);
    try {
      stream.kill('SIGTERM');
      
      // Force kill if not terminated within 5 seconds
      setTimeout(() => {
        if (streamManager.has(cameraIdStr)) {
          console.log(`Force killing stream for camera ${cameraIdStr}`);
          stream.kill('SIGKILL');
        }
      }, 5000);
    } catch (error) {
      console.error(`Error stopping stream ${cameraIdStr}:`, error.message);
    }
    streamManager.delete(cameraIdStr);
  }
}

// API Routes with performance optimizations
app.get('/api/status', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'running',
    activeStreams: streamManager.keys(),
    connectedClients: wsManager.size(),
    maxStreams: MAX_CONCURRENT_STREAMS,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    },
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Enhanced logs endpoint with performance data
app.get('/api/logs', (req, res) => {
  const recentLogs = [
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [INFO] Backend server running on port ${PORT}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [STATUS] Active streams: ${streamManager.size()}/${MAX_CONCURRENT_STREAMS}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [STATUS] Connected clients: ${wsManager.size()}`,
    `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [SYSTEM] Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
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
    '-timeout', '10000000',
    outputPath
  ]);

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      res.json({
        success: true,
        filename: filename,
        url: `/snapshots/${filename}`
      });

      wsManager.broadcast({
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

app.get('/api/sip/config', async (req, res) => {
  try {
    const config = await asteriskManager.getSipConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sip/config', async (req, res) => {
  try {
    const config = await asteriskManager.updateSipConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sip/extensions', async (req, res) => {
  try {
    const extensions = await asteriskManager.getExtensions();
    res.json(extensions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sip/extensions', async (req, res) => {
  try {
    const extension = await asteriskManager.createExtension(req.body);
    
    if (req.body.reloadAsterisk !== false) {
      try {
        await asteriskManager.reloadAsterisk();
      } catch (reloadError) {
        console.warn('Could not reload Asterisk:', reloadError.message);
      }
    }
    
    wsManager.broadcast({
      type: 'sip_extension_created',
      extension: extension,
      timestamp: new Date().toISOString()
    });
    
    res.json(extension);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sip/extensions/:id', async (req, res) => {
  try {
    const extension = await asteriskManager.updateExtension(req.params.id, req.body);
    
    if (req.body.reloadAsterisk !== false) {
      try {
        await asteriskManager.reloadAsterisk();
      } catch (reloadError) {
        console.warn('Could not reload Asterisk:', reloadError.message);
      }
    }
    
    wsManager.broadcast({
      type: 'sip_extension_updated',
      extension: extension,
      timestamp: new Date().toISOString()
    });
    
    res.json(extension);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sip/extensions/:id', async (req, res) => {
  try {
    const result = await asteriskManager.deleteExtension(req.params.id);
    
    try {
      await asteriskManager.reloadAsterisk();
    } catch (reloadError) {
      console.warn('Could not reload Asterisk:', reloadError.message);
    }
    
    wsManager.broadcast({
      type: 'sip_extension_deleted',
      extensionId: req.params.id,
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sip/start', async (req, res) => {
  try {
    const result = await asteriskManager.startAsterisk();
    
    wsManager.broadcast({
      type: 'asterisk_status',
      status: 'started',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sip/stop', async (req, res) => {
  try {
    const result = await asteriskManager.stopAsterisk();
    
    wsManager.broadcast({
      type: 'asterisk_status',
      status: 'stopped',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sip/status', async (req, res) => {
  try {
    const status = await asteriskManager.getAsteriskStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sip/reload', async (req, res) => {
  try {
    const result = await asteriskManager.reloadAsterisk();
    
    wsManager.broadcast({
      type: 'asterisk_reloaded',
      timestamp: new Date().toISOString()
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sip/peers', async (req, res) => {
  try {
    const peers = await asteriskManager.getSipPeers();
    res.json(peers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sip/generate-config', async (req, res) => {
  try {
    const configs = await asteriskManager.generateAsteriskConfig();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced logging with rate limiting
let logCount = 0;
const LOG_RATE_LIMIT = 100; // Max logs per minute

function logToClients(level, message) {
  logCount++;
  if (logCount > LOG_RATE_LIMIT) {
    return; // Rate limit exceeded
  }
  
  const logEntry = {
    type: 'log',
    level: level,
    message: `[${new Date().toISOString().slice(0, 19).replace('T', ' ')}] [${level}] ${message}`,
    timestamp: new Date().toISOString()
  };
  
  wsManager.broadcast(logEntry);
  console.log(logEntry.message);
}

// Reset log count every minute
setInterval(() => {
  logCount = 0;
}, 60000);

// Start server with enhanced error handling
server.listen(PORT, () => {
  console.log(`JERICHO Backend Server running on port ${PORT}`);
  console.log(`Max concurrent streams: ${MAX_CONCURRENT_STREAMS}`);
  console.log(`WebSocket server ready with heartbeat`);
  console.log(`HLS streams: http://localhost:${PORT}/hls/`);
  console.log(`Snapshots: http://localhost:${PORT}/snapshots/`);
  console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
});

// Enhanced graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Clean up all streams
  streamManager.cleanup();
  
  // Close database
  db.close((err) => {
    if (err) {
      console.error('Database close error:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('Force exiting...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions and promise rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
