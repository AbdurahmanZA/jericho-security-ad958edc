
export const macosScript = `#!/bin/bash
# JERICHO Security System - macOS Installation Script
# Updated with latest configuration and fixes

set -e

echo "========================================"
echo "JERICHO Security System - macOS Setup"
echo "========================================"

# Check for Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    echo "❌ Xcode Command Line Tools not found"
    echo "Please install by running: xcode-select --install"
    exit 1
fi

# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
    echo "🍺 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Update Homebrew
echo "🔄 Updating Homebrew..."
brew update

# Install required packages
echo "📦 Installing required packages..."
brew install node nginx git ffmpeg sqlite3 wget curl

# Verify Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "🟢 Installing Node.js 18..."
    brew install node@18
    brew link --force node@18
fi

# Create installation directory
INSTALL_DIR="/usr/local/var/jericho-security"
echo "📁 Creating installation directory: $INSTALL_DIR"
sudo mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download from GitHub
echo "⬇️ Downloading JERICHO Security System..."
REPO_URL="https://github.com/AbdurahmanZA/jericho-security-ad958edc.git"

if sudo git clone "$REPO_URL" .; then
    echo "✅ Repository cloned successfully"
else
    echo "❌ Failed to clone repository. Please ensure:"
    echo "1. The repository URL is correct"
    echo "2. You have access to the repository" 
    echo "3. Git credentials are configured if repository is private"
    exit 1
fi

# Set proper ownership
sudo chown -R $(whoami):staff "$INSTALL_DIR"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend application..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Configure nginx
echo "🔧 Configuring nginx..."
NGINX_CONF="/usr/local/etc/nginx/servers/jericho-security.conf"
sudo mkdir -p "$(dirname "$NGINX_CONF")"

sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name localhost jericho.local;
    root /usr/local/var/jericho-security/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # CORS headers for camera streams
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Handle assets with correct MIME types
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        location ~* \\.js$ {
            add_header Content-Type "application/javascript";
        }
        location ~* \\.css$ {
            add_header Content-Type "text/css";
        }
        location ~* \\.json$ {
            add_header Content-Type "application/json";
        }
    }

    # HLS streaming configuration
    location /hls/ {
        add_header Cache-Control "no-cache, must-revalidate";
        add_header Access-Control-Allow-Origin "*";
        
        location ~* \\.m3u8$ {
            add_header Content-Type "application/vnd.apple.mpegurl";
            expires 1s;
        }
        location ~* \\.ts$ {
            add_header Content-Type "video/mp2t";
            expires 10s;
            add_header Accept-Ranges bytes;
        }
    }

    # Snapshots
    location /snapshots/ {
        expires 1h;
        add_header Cache-Control "public";
    }

    # WebSocket proxy for /api/ws (using http:// for internal communication)
    location /api/ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Update main nginx configuration
MAIN_NGINX_CONF="/usr/local/etc/nginx/nginx.conf"
if ! grep -q "include.*servers" "$MAIN_NGINX_CONF"; then
    sudo sed -i '' '/http {/a\\
    \\    include /usr/local/etc/nginx/servers/*;' "$MAIN_NGINX_CONF"
fi

# Add WebSocket upgrade map to main config
if ! grep -q "map.*http_upgrade" "$MAIN_NGINX_CONF"; then
    sudo sed -i '' '/http {/a\\
\\    map $http_upgrade $connection_upgrade {\\
\\        default upgrade;\\
\\        '"'"''"'"' close;\\
\\    }' "$MAIN_NGINX_CONF"
fi

# Create media directories
echo "📁 Creating media directories..."
mkdir -p "$INSTALL_DIR/dist/hls"
mkdir -p "$INSTALL_DIR/dist/snapshots"

# Create launchd plist for backend service
echo "⚙️ Creating backend service..."
BACKEND_PLIST="$HOME/Library/LaunchAgents/com.jericho.backend.plist"
mkdir -p "$(dirname "$BACKEND_PLIST")"

cat > "$BACKEND_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jericho.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$INSTALL_DIR/backend/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR/backend</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/usr/local/var/log/jericho-backend.log</string>
    <key>StandardErrorPath</key>
    <string>/usr/local/var/log/jericho-backend-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

# Create startup scripts
echo "📝 Creating startup scripts..."

# Start script
cat > "$INSTALL_DIR/start-jericho.sh" << 'EOF'
#!/bin/bash
echo "========================================"
echo "JERICHO Security System - macOS"
echo "========================================"
echo ""

echo "🚀 Starting JERICHO Security System..."

# Start backend service
echo "📡 Starting backend service..."
launchctl load ~/Library/LaunchAgents/com.jericho.backend.plist 2>/dev/null || true
launchctl start com.jericho.backend

# Start nginx
echo "🌐 Starting nginx..."
sudo brew services start nginx

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 3

# Test backend
if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️ Backend may need more time to start"
fi

# Test frontend
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️ Frontend may need troubleshooting"
fi

echo ""
echo "🎯 System Status:"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:3001/api/status"
echo "📊 Backend logs: tail -f /usr/local/var/log/jericho-backend.log"
echo "📊 nginx logs: tail -f /usr/local/var/log/nginx/access.log"
echo ""
echo "🔧 Management:"
echo "• Stop: ./stop-jericho.sh"
echo "• Restart backend: launchctl restart com.jericho.backend"
echo "• Restart nginx: sudo brew services restart nginx"
echo ""
echo "Opening web interface..."
sleep 2
open http://localhost
EOF

# Stop script
cat > "$INSTALL_DIR/stop-jericho.sh" << 'EOF'
#!/bin/bash
echo "🛑 Stopping JERICHO Security System..."

# Stop backend service
echo "📡 Stopping backend service..."
launchctl stop com.jericho.backend
launchctl unload ~/Library/LaunchAgents/com.jericho.backend.plist 2>/dev/null || true

# Stop nginx
echo "🌐 Stopping nginx..."
sudo brew services stop nginx

echo "✅ JERICHO Security System stopped"
EOF

# Make scripts executable
chmod +x "$INSTALL_DIR/start-jericho.sh"
chmod +x "$INSTALL_DIR/stop-jericho.sh"

# Create log directory
sudo mkdir -p /usr/local/var/log
sudo chown $(whoami):staff /usr/local/var/log

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Load backend service
echo "🔧 Loading backend service..."
launchctl load "$BACKEND_PLIST"

# Start services
echo "🚀 Starting services..."
launchctl start com.jericho.backend
sudo brew services start nginx

# Test installation
echo "🧪 Testing installation..."
sleep 5

if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "✅ Backend test successful"
else
    echo "⚠️ Backend may need troubleshooting"
    echo "📊 Check logs: tail -f /usr/local/var/log/jericho-backend.log"
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend test successful"
else
    echo "⚠️ Frontend may need troubleshooting"
    echo "📊 Check nginx: sudo nginx -t && sudo brew services restart nginx"
fi

echo "========================================"
echo "✅ JERICHO Security System Installed!"
echo "========================================"
echo ""
echo "📁 Installation: $INSTALL_DIR"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:3001/api/status"
echo ""
echo "🚀 Quick Start:"
echo "   cd $INSTALL_DIR"
echo "   ./start-jericho.sh    # Start system"
echo "   ./stop-jericho.sh     # Stop system"
echo ""
echo "🔧 Service Management:"
echo "• Backend: launchctl [start|stop] com.jericho.backend"
echo "• nginx: sudo brew services [start|stop|restart] nginx"
echo "• Logs: tail -f /usr/local/var/log/jericho-backend.log"
echo ""
echo "🎯 Next Steps:"
echo "1. Access http://localhost in your browser"
echo "2. Add your camera RTSP URLs"
echo "3. Configure SIP/VoIP settings if needed"
echo "4. Test HLS streaming functionality"
echo ""
echo "💡 Tips:"
echo "• Use start-jericho.sh for easy startup"
echo "• Backend runs as a user service (launchd)"
echo "• nginx serves frontend with WebSocket proxy"
echo "• WebSocket uses ws:// internally, wss:// externally"
echo "• Check logs if you encounter issues"
echo "========================================"
echo ""
echo "Opening web interface..."
sleep 2
open http://localhost
`;
