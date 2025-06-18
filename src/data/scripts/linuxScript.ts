

export const linuxScript = `#!/bin/bash
# JERICHO Security System - Simplified Ubuntu 24.04 Installation
# Self-contained installation that minimizes future update requirements

set -e

echo "Installing JERICHO Security System - Simplified Version..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install core dependencies in one go (removed npm since NodeSource nodejs includes it)
sudo apt install -y \\
  nodejs git apache2 ffmpeg \\
  asterisk asterisk-modules asterisk-config \\
  certbot python3-certbot-apache \\
  build-essential curl wget

# Verify Node.js version (should be 18+ from NodeSource or Ubuntu 24.04 repos)
NODE_VERSION=\$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "\$NODE_VERSION" -lt 18 ]; then
  echo "Installing newer Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "Node.js version: \$(node --version)"
echo "npm version: \$(npm --version)"

# Fix npm cache permissions
sudo mkdir -p /var/www/.npm
sudo chown -R www-data:www-data /var/www/.npm

# Configure Apache modules (enable required ones)
sudo a2enmod rewrite headers ssl proxy proxy_http proxy_wstunnel

# Stop Apache and prepare web directory
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo chown -R www-data:www-data /var/www/html/

# Clone and build application
echo "Downloading JERICHO Security System..."
cd /tmp
sudo rm -rf jericho-security-system
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git jericho-security-system
cd jericho-security-system

# Build frontend
echo "Building frontend application..."
npm install
npm run build
sudo cp -r dist/* /var/www/html/

# Setup backend
echo "Setting up backend server..."
sudo rm -rf /opt/jericho-backend
sudo mkdir -p /opt/jericho-backend
sudo cp -r backend/* /opt/jericho-backend/
sudo chown -R www-data:www-data /opt/jericho-backend

# Install backend dependencies with proper permissions
cd /opt/jericho-backend
sudo -u www-data npm install

# Create required directories
sudo mkdir -p /opt/jericho-backend/{hls,snapshots}
sudo chown -R www-data:www-data /opt/jericho-backend
sudo ln -sf /opt/jericho-backend/hls /var/www/html/hls
sudo ln -sf /opt/jericho-backend/snapshots /var/www/html/snapshots

# Configure Apache site
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerName jericho.local
    DocumentRoot /var/www/html

    # CORS headers for media files
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"

    # HLS and media serving
    <Directory "/var/www/html/hls">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts
    </Directory>

    <Directory "/var/www/html/snapshots">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    # Proxy backend API and WebSocket
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
</VirtualHost>
EOF

# Enable site and disable default
sudo a2ensite jericho.conf
sudo a2dissite 000-default.conf

# Configure Asterisk permissions
sudo usermod -a -G asterisk www-data
sudo tee /etc/sudoers.d/jericho-asterisk > /dev/null <<'EOF'
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status asterisk
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -rx *
EOF

# Create backend service
sudo tee /etc/systemd/system/jericho-backend.service > /dev/null <<'EOF'
[Unit]
Description=JERICHO Security System Backend
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

# Configure firewall
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 3001/tcp comment "Backend API"
sudo ufw allow 5060/udp comment "SIP"
sudo ufw allow 10000:20000/udp comment "RTP"

# Start services
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo systemctl enable asterisk
sudo systemctl restart apache2

# Cleanup
cd ~
sudo rm -rf /tmp/jericho-security-system

echo ""
echo "=================================="
echo "JERICHO Security System Installed!"
echo "=================================="
echo ""
echo "🚀 Access your system:"
echo "   Web Interface: http://localhost"
echo "   Backend API: http://localhost:3001/api/status"
echo ""
echo "📋 Post-Installation Steps:"
echo "1. Open web interface and go to Settings"
echo "2. Configure camera RTSP URLs"
echo "3. Set up SIP extensions if needed"
echo "4. Start Asterisk from Settings > SIP/VoIP"
echo ""
echo "🔧 Service Management:"
echo "   Backend status: sudo systemctl status jericho-backend"
echo "   Backend logs: sudo journalctl -u jericho-backend -f"
echo "   Asterisk status: sudo systemctl status asterisk"
echo ""
echo "🔒 For HTTPS (optional):"
echo "   Run: sudo certbot --apache"
echo "=================================="
echo ""
echo "✅ Installation complete! The system is ready to use."`;

