
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Complete Ubuntu 24.04 Installation Script
# Updated with all latest fixes for WebSocket, Apache, and HLS streaming

set -e

echo "========================================"
echo "JERICHO Security System Installation"
echo "Ubuntu 24.04 LTS - Complete Setup"
echo "========================================"

# Update system
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y git nodejs npm apache2 ffmpeg sqlite3 build-essential curl wget unzip

# Install Node.js 18+ if needed
if ! node --version | grep -q "v1[89]\\|v[2-9][0-9]"; then
    echo "🟢 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Enable required Apache modules
echo "🔧 Configuring Apache modules..."
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod ssl

# Create project directory
INSTALL_DIR="/opt/jericho-security"
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

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
sudo npm install

# Build frontend
echo "🏗️ Building frontend application..."
sudo npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
sudo npm install
cd ..

# Set proper ownership
sudo chown -R www-data:www-data "$INSTALL_DIR"

# Deploy frontend to Apache
echo "🚀 Deploying frontend to Apache..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Create Apache virtual host configuration
echo "⚙️ Configuring Apache virtual host..."
sudo tee /etc/apache2/sites-available/jericho-security.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    ServerAlias 192.168.0.138
    DocumentRoot /var/www/html

    # Enable CORS for all requests
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Enable rewrite engine
    RewriteEngine On

    # Serve HLS and snapshots files directly BEFORE SPA fallback
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]

    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]

    # CRITICAL: Exclude /assets/ from SPA fallback
    RewriteCond %{REQUEST_URI} ^/assets/
    RewriteRule .* - [L]

    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    # Set proper MIME types for assets
    AddType application/javascript .js
    AddType text/css .css
    AddType application/json .json

    # HLS specific configuration
    <Directory "/var/www/html/hls">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted

        # Set proper MIME types for HLS
        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts

        # Cache control for HLS files
        ExpiresActive On
        ExpiresByType application/vnd.apple.mpegurl "access plus 1 seconds"
        ExpiresByType video/mp2t "access plus 10 seconds"

        # Enable range requests for HLS segments
        Header set Accept-Ranges bytes
    </Directory>

    <Directory "/var/www/html/snapshots">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted

        # Cache control for snapshots
        ExpiresActive On
        ExpiresByType image/jpeg "access plus 1 hour"
        ExpiresByType image/png "access plus 1 hour"
    </Directory>

    # Assets directory with proper MIME types
    <Directory "/var/www/html/assets">
        Options -Indexes
        AllowOverride None
        Require all granted

        # Force correct MIME types for assets
        <FilesMatch "\\.js$">
            ForceType application/javascript
        </FilesMatch>
        <FilesMatch "\\.css$">
            ForceType text/css
        </FilesMatch>
        <FilesMatch "\\.json$">
            ForceType application/json
        </FilesMatch>
    </Directory>

    # Enable AllowOverride for main directory
    <Directory "/var/www/html">
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy settings for backend API and WebSocket
    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket proxy for /api/ws (using ws:// not wss://)
    ProxyPass /api/ws ws://localhost:3001/api/ws
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws

    # Regular HTTP proxy for all other API requests
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
</VirtualHost>
EOF

# Disable default site and enable jericho-security
echo "🔧 Configuring Apache sites..."
sudo a2dissite 000-default.conf || true
sudo a2dissite jericho.conf || true
sudo a2ensite jericho-security.conf

# Create systemd service for backend
echo "⚙️ Creating backend systemd service..."
sudo tee /etc/systemd/system/jericho-backend.service > /dev/null << EOF
[Unit]
Description=JERICHO Security Backend Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Create directories for HLS and snapshots
echo "📁 Creating media directories..."
sudo mkdir -p /var/www/html/hls
sudo mkdir -p /var/www/html/snapshots
sudo chown -R www-data:www-data /var/www/html/hls
sudo chown -R www-data:www-data /var/www/html/snapshots

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 3001/tcp comment "Backend API"

# Enable and start services
echo "🚀 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo systemctl restart apache2

# Test backend connection
echo "🧪 Testing backend connection..."
sleep 3
if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "⚠️ Backend may need more time to start"
fi

# Install Asterisk for VoIP (optional)
echo "📞 Installing Asterisk for VoIP support..."
sudo apt install -y asterisk asterisk-modules asterisk-config

# Configure sudo permissions for backend management
sudo tee /etc/sudoers.d/jericho-backend > /dev/null << 'EOF'
# Allow www-data to manage backend services
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status jericho-backend
EOF

echo "========================================"
echo "✅ JERICHO Security System Installed!"
echo "========================================"
echo "🌐 Frontend: http://localhost (or your server IP)"
echo "🔧 Backend API: http://localhost:3001/api/status"
echo "📁 Installation: $INSTALL_DIR"
echo "📋 Logs: sudo journalctl -u jericho-backend -f"
echo ""
echo "🎯 Next Steps:"
echo "1. Access the web interface at http://localhost"
echo "2. Add your camera RTSP URLs in the interface"
echo "3. Configure SIP/VoIP settings if needed"
echo "4. Test HLS streaming functionality"
echo ""
echo "🔧 Service Management:"
echo "• Start backend: sudo systemctl start jericho-backend"
echo "• Stop backend: sudo systemctl stop jericho-backend"
echo "• Restart backend: sudo systemctl restart jericho-backend"
echo "• Check status: sudo systemctl status jericho-backend"
echo "• View logs: sudo journalctl -u jericho-backend -f"
echo "========================================"
`;
