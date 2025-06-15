
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Ubuntu 24.04 Complete Installation Script
# Includes frontend, backend server, and RTSP processing modules
set -e

echo "Installing JERICHO Security System with Backend Server..."

# Update system and install base dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y git apache2 nodejs npm python3 python3-pip curl wget build-essential

# Install FFmpeg for RTSP stream processing
sudo apt install -y ffmpeg

# Install OpenCV dependencies for motion detection
sudo apt install -y python3-opencv libopencv-dev python3-numpy

# Install additional media processing tools
sudo apt install -y v4l-utils gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad

# Install Node.js 20 (latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
echo "Node.js version: \$(node --version)"
echo "npm version: \$(npm --version)"
echo "FFmpeg version: \$(ffmpeg -version | head -n1)"

# Enable Apache modules
sudo a2enmod rewrite
sudo a2enmod mime
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel

# Stop Apache and clean web directory
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo chown -R www-data:www-data /var/www/html/

# Remove any existing installation
sudo rm -rf jericho-security-system

# Clone and build frontend
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git jericho-security-system && \\
cd jericho-security-system && \\
npm install && \\
npm run build && \\
sudo cp -r dist/* /var/www/html/ && \\
cd ..

# Create backend server directory
sudo mkdir -p /opt/jericho-backend
sudo chown -R \$USER:www-data /opt/jericho-backend

# Create backend server package.json
cat > /opt/jericho-backend/package.json << 'EOF'
{
  "name": "jericho-backend",
  "version": "1.0.0",
  "description": "JERICHO Security System Backend Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "node-rtsp-stream": "^0.0.9",
    "fluent-ffmpeg": "^2.1.2",
    "sharp": "^0.32.6",
    "sqlite3": "^5.1.6",
    "uuid": "^9.0.1"
  }
}
EOF

# Install backend dependencies
cd /opt/jericho-backend
npm install

# Create main backend server
cat > /opt/jericho-backend/server.js << 'EOF'
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = 3001;
const HLS_DIR = '/opt/jericho-backend/hls';
const SNAPSHOTS_DIR = '/opt/jericho-backend/snapshots';

// Create directories
[HLS_DIR, SNAPSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Database setup
const db = new sqlite3.Database('/opt/jericho-backend/jericho.db');
db.serialize(() => {
  db.run(\`CREATE TABLE IF NOT EXISTS cameras (
    id INTEGER PRIMARY KEY,
    name TEXT,
    url TEXT,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )\`);
  
  db.run(\`CREATE TABLE IF NOT EXISTS motion_events (
    id INTEGER PRIMARY KEY,
    camera_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    snapshot_path TEXT,
    FOREIGN KEY(camera_id) REFERENCES cameras(id)
  )\`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/hls', express.static(HLS_DIR));
app.use('/snapshots', express.static(SNAPSHOTS_DIR));

// Active streams tracking
const activeStreams = new Map();
const connectedClients = new Set();

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
    console.log(\`Stream \${cameraId} already active\`);
    return;
  }
  
  console.log(\`Starting RTSP stream for camera \${cameraId}: \${rtspUrl}\`);
  
  const outputPath = path.join(HLS_DIR, \`camera_\${cameraId}.m3u8\`);
  
  const ffmpeg = spawn('ffmpeg', [
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '3',
    '-hls_flags', 'delete_segments',
    '-preset', 'ultrafast', 
    '-tune', 'zerolatency',
    '-s', '640x480',
    '-r', '15',
    outputPath
  ]);
  
  ffmpeg.on('spawn', () => {
    console.log(\`FFmpeg process started for camera \${cameraId}\`);
    activeStreams.set(cameraId, ffmpeg);
    
    broadcast({
      type: 'stream_status',
      cameraId: cameraId,
      status: 'started',
      hlsUrl: \`/hls/camera_\${cameraId}.m3u8\`,
      timestamp: new Date().toISOString()
    });
  });
  
  ffmpeg.on('error', (error) => {
    console.error(\`FFmpeg error for camera \${cameraId}:\`, error);
    activeStreams.delete(cameraId);
    
    broadcast({
      type: 'stream_error',
      cameraId: cameraId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  ffmpeg.on('exit', (code) => {
    console.log(\`FFmpeg process exited for camera \${cameraId} with code \${code}\`);
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
    if (output.includes('error') || output.includes('Error')) {
      console.error(\`FFmpeg stderr for camera \${cameraId}:\`, output);
    }
  });
}

function stopRTSPStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (stream) {
    console.log(\`Stopping RTSP stream for camera \${cameraId}\`);
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
    timestamp: new Date().toISOString()
  });
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
    '-timeout', '10000000', // 10 seconds
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
  const filename = \`snapshot_\${cameraId}_\${Date.now()}.jpg\`;
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
        url: \`/snapshots/\${filename}\`
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

// Start server
server.listen(PORT, () => {
  console.log(\`JERICHO Backend Server running on port \${PORT}\`);
  console.log(\`WebSocket server ready\`);
  console.log(\`HLS streams available at: http://localhost:\${PORT}/hls/\`);
  console.log(\`Snapshots available at: http://localhost:\${PORT}/snapshots/\`);
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
EOF

# Create systemd service for backend
sudo tee /etc/systemd/system/jericho-backend.service > /dev/null << 'EOF'
[Unit]
Description=JERICHO Security System Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/jericho-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
sudo chown -R www-data:www-data /opt/jericho-backend
sudo chmod +x /opt/jericho-backend/server.js

# Configure Apache with backend proxy
sudo tee /etc/apache2/sites-available/000-default.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName jericho-security
    ServerAlias 192.168.0.138

    # Frontend static files
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks

        # MIME types
        AddType text/css .css
        AddType application/javascript .js
        AddType application/json .json

        # SPA fallback
        FallbackResource /index.html
    </Directory>

    # Backend API proxy
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    # HLS streams proxy
    ProxyPass /hls/ http://localhost:3001/hls/
    ProxyPassReverse /hls/ http://localhost:3001/hls/

    # Snapshots proxy
    ProxyPass /snapshots/ http://localhost:3001/snapshots/
    ProxyPassReverse /snapshots/ http://localhost:3001/snapshots/

    # WebSocket proxy
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    # Disable fallback for assets and API endpoints
    <LocationMatch "^/(assets|api|hls|snapshots|ws)/">
        RewriteEngine Off
    </LocationMatch>

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Update .htaccess for frontend
sudo tee /var/www/html/.htaccess > /dev/null << 'EOF'
RewriteEngine On

# Skip rewrite for backend endpoints
RewriteCond %{REQUEST_URI} ^/(api|hls|snapshots|ws)/ [NC]
RewriteRule .* - [L]

# Skip rewrite for assets
RewriteCond %{REQUEST_URI} ^/assets/ [NC]
RewriteRule .* - [L]

# MIME types
AddType text/css .css
AddType application/javascript .js
AddType application/json .json

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^.*$ /index.html [QSA,L]

# Cache headers for assets
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000"
</FilesMatch>
EOF

# Set final permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 644 /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \\;

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo systemctl restart apache2

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp

echo "\\n=================================="
echo "JERICHO Security System Installation Complete!"
echo "\\n🚀 Services Status:"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3001/api/status"
echo "WebSocket: ws://localhost:3001"
echo "\\n📊 Check service status:"
echo "sudo systemctl status jericho-backend"
echo "sudo systemctl status apache2"
echo "\\n📁 Backend logs:"
echo "sudo journalctl -u jericho-backend -f"
echo "\\n🔧 Backend directory: /opt/jericho-backend"
echo "=================================="
`
