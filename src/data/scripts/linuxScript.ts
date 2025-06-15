
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

# Clone repository
echo "Cloning JERICHO Security System repository..."
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git jericho-security-system && \\
cd jericho-security-system

# Build and deploy frontend
echo "Building frontend..."
npm install && \\
npm run build && \\
sudo cp -r dist/* /var/www/html/

# Set up backend from repository files
echo "Setting up backend server..."
sudo mkdir -p /opt/jericho-backend
sudo cp -r backend/* /opt/jericho-backend/
sudo chown -R www-data:www-data /opt/jericho-backend

# Install backend dependencies
echo "Installing backend dependencies..."
cd /opt/jericho-backend
sudo npm install

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

# Return to home directory
cd ~

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
