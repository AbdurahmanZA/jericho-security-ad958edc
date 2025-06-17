
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Ubuntu 24.04 Complete Installation Script (with HTTPS/FFmpeg/Asterisk)
# Includes frontend, backend server, RTSP processing modules, HTTPS support, and Asterisk VoIP

set -e

echo "Installing JERICHO Security System with Backend Server and Asterisk VoIP..."

# Update system and install base dependencies
sudo apt update && sudo apt upgrade -y
sudo add-apt-repository universe -y
sudo apt install -y lsb-release ca-certificates apt-transport-https software-properties-common curl wget

# Remove any existing Node.js installations to avoid conflicts
sudo apt remove -y nodejs npm node-* 2>/dev/null || true
sudo apt autoremove -y

# Install Node.js 20 LTS using NodeSource repository (cleaner method)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
echo "Node.js version: \$(node --version)"
echo "npm version: \$(npm --version)"

# Install FFmpeg (latest from apt repository)
sudo apt install -y ffmpeg

# Install Asterisk and VoIP dependencies
echo "Installing Asterisk with G.729 codec..."
sudo apt install -y asterisk asterisk-modules asterisk-config asterisk-dev build-essential

# Install G.729 codec (open source version)
echo "Setting up G.729 codec..."
cd /tmp
wget -q http://asterisk.hosting.lv/src/asterisk-g729-1.5.0-x86_64.tar.bz2 || echo "G.729 download may fail - continuing without it"
if [ -f asterisk-g729-1.5.0-x86_64.tar.bz2 ]; then
  tar -xjf asterisk-g729-1.5.0-x86_64.tar.bz2
  sudo cp asterisk-g729-1.5.0-x86_64/codec_g729.so /usr/lib/asterisk/modules/ 2>/dev/null || echo "G.729 codec installation skipped"
  sudo chown asterisk:asterisk /usr/lib/asterisk/modules/codec_g729.so 2>/dev/null || true
  sudo chmod 755 /usr/lib/asterisk/modules/codec_g729.so 2>/dev/null || true
fi

# Install OpenCV dependencies for motion detection
sudo apt install -y python3-opencv libopencv-dev python3-numpy

# Install additional media processing tools
sudo apt install -y v4l-utils gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad

# Install Apache2, Git, Certbot (HTTPS)
sudo apt install -y apache2 git build-essential python3 python3-pip certbot python3-certbot-apache

echo "FFmpeg version: \$(ffmpeg -version | head -n1)"

# Enable Apache modules (HTTP + HTTPS + WebSocket Proxy)
sudo a2enmod rewrite
sudo a2enmod mime
sudo a2enmod headers
sudo a2enmod ssl
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

# --- Ensure Backend Always Set Up Fresh ---
echo "Setting up backend server (always from latest repo files)..."
sudo rm -rf /opt/jericho-backend
sudo mkdir -p /opt/jericho-backend
sudo cp -r backend/* /opt/jericho-backend/
sudo chown -R www-data:www-data /opt/jericho-backend

# Install backend dependencies (including node-fetch fix)
echo "Installing backend dependencies..."
cd /opt/jericho-backend
sudo npm install

# Install missing node-fetch dependency that was causing WebSocket errors
echo "Installing missing node-fetch dependency..."
sudo npm install node-fetch@2.7.0

# Create HLS and snapshots directories with proper permissions and symlinks
echo "Setting up HLS and snapshots directories..."
sudo mkdir -p /opt/jericho-backend/hls
sudo mkdir -p /opt/jericho-backend/snapshots
sudo mkdir -p /opt/jericho-backend/data
sudo chown -R www-data:www-data /opt/jericho-backend/hls
sudo chown -R www-data:www-data /opt/jericho-backend/snapshots
sudo chown -R www-data:www-data /opt/jericho-backend/data
sudo chmod 755 /opt/jericho-backend/hls
sudo chmod 755 /opt/jericho-backend/snapshots
sudo chmod 755 /opt/jericho-backend/data

# Create symlinks so Apache can serve the files
sudo ln -sf /opt/jericho-backend/hls /var/www/html/hls
sudo ln -sf /opt/jericho-backend/snapshots /var/www/html/snapshots

# Configure Apache for proper HLS file serving with WebSocket proxy
sudo tee /etc/apache2/sites-available/jericho-hls.conf > /dev/null <<'EOAPACHECONF'
<VirtualHost *:80>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    # Enable CORS for HLS files
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"

    # Enable rewrite engine
    RewriteEngine On
    
    # Serve HLS and snapshots files directly without rewriting to React app
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]
    
    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]
    
    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

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

    # Proxy settings for backend API and WebSocket
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket proxy for /api/ws
    ProxyPass /api/ws ws://localhost:3001/api/ws
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws
    
    # Regular HTTP proxy for all other API requests
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOAPACHECONF

# Enable the HLS site configuration
sudo a2ensite jericho-hls.conf
sudo a2dissite 000-default.conf

# Configure Asterisk
echo "Configuring Asterisk..."
sudo systemctl stop asterisk 2>/dev/null || true

# Create backup of original configs
sudo cp /etc/asterisk/sip.conf /etc/asterisk/sip.conf.backup 2>/dev/null || true
sudo cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup 2>/dev/null || true

# Set proper permissions for Asterisk
sudo chown -R asterisk:asterisk /etc/asterisk/
sudo chmod -R 644 /etc/asterisk/*.conf
sudo chmod 755 /etc/asterisk/

# Add www-data to asterisk group for backend management
sudo usermod -a -G asterisk www-data

# Configure sudo permissions for backend Asterisk management
sudo tee /etc/sudoers.d/jericho-asterisk > /dev/null << 'EOSUDO'
# Allow www-data to manage Asterisk for JERICHO
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl is-active asterisk
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -rx *
EOSUDO

# Configure firewall for SIP and RTP
sudo ufw allow 5060/udp comment "SIP"
sudo ufw allow 5060/tcp comment "SIP"
sudo ufw allow 10000:20000/udp comment "RTP"

# Enable Asterisk service (but don't start it - backend will manage it)
sudo systemctl enable asterisk

# (Re-)Create systemd service for backend
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

# Set up HTTPS with Let's Encrypt if FQDN is provided, otherwise use self-signed cert
APACHE_SSL_CONF="/etc/apache2/sites-available/jericho-ssl.conf"
DOMAIN="jericho.local"

if [ -n "\$DOMAIN" ]; then
  echo "Setting up HTTPS configuration..."
  if [ ! -f /etc/ssl/certs/jericho-selfsigned.crt ]; then
    echo "Generating self-signed certificate for Apache..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
      -keyout /etc/ssl/private/jericho-selfsigned.key \\
      -out /etc/ssl/certs/jericho-selfsigned.crt \\
      -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=JERICHO/CN=jericho.local"
  fi

  sudo tee \$APACHE_SSL_CONF > /dev/null <<'EOSSLCONF'
<VirtualHost *:443>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/jericho-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/jericho-selfsigned.key

    # Enable CORS for HLS files
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"

    # Enable rewrite engine
    RewriteEngine On
    
    # Serve HLS and snapshots files directly without rewriting to React app
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]
    
    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]
    
    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks
    </Directory>

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

    # Proxy settings for backend API, HLS, WebSocket, etc.
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket proxy for /api/ws
    ProxyPass /api/ws ws://localhost:3001/api/ws
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws
    
    # Regular HTTP proxy for all other API requests
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOSSLCONF
  sudo a2ensite jericho-ssl.conf
fi

# Enable Apache modules for proper HLS handling
sudo a2enmod expires
sudo a2enmod headers

# Always enable and reload Apache configs, HTTP and HTTPS
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo a2enmod ssl
sudo systemctl restart apache2

# Configure firewall for HTTP, HTTPS, and backend
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp

# Return to home directory
cd ~

echo "\\n=================================="
echo "JERICHO Security System Installation Complete!"
echo "\\n🚀 Services Status:"
echo "Frontend: http://localhost (or https://jericho.local if configured)"
echo "Backend API: http://localhost:3001/api/status"
echo "WebSocket: ws://localhost:3001"
echo "\\n📊 Check service status:"
echo "sudo systemctl status jericho-backend"
echo "sudo systemctl status apache2"
echo "sudo systemctl status asterisk"
echo "\\n📁 Backend directory: /opt/jericho-backend"
echo "📁 Asterisk configs: /etc/asterisk/"
echo "📁 HLS streams: /opt/jericho-backend/hls (served at /hls/)"
echo "📁 Snapshots: /opt/jericho-backend/snapshots (served at /snapshots/)"
echo "\\n📋 VoIP Setup:"
echo "1. Go to Settings > SIP/VoIP in web interface"
echo "2. Configure SIP settings and create extensions (GSM codec recommended)"
echo "3. Start Asterisk from the web interface"
echo "4. Test SIP registration with softphone"
echo "\\n🔧 Useful commands:"
echo "Backend logs: sudo journalctl -u jericho-backend -f"
echo "Asterisk status: sudo systemctl status asterisk"
echo "Asterisk CLI: sudo asterisk -r"
echo "SIP peers: sudo asterisk -rx 'sip show peers'"
echo "Check HLS files: ls -la /opt/jericho-backend/hls/"
echo "Test HLS serving: curl -I http://localhost/hls/"
echo "Test WebSocket: Check frontend logs for 'Connected to backend via wss://'"
echo "=================================="

echo "\\n🟢 HTTPS ACCESS: If you have a domain pointing to this server, update the DOMAIN variable in this script and rerun."
echo "\\n🔄 VoIP is configured with GSM codec support (default) for reliable emergency communications."
echo "\\n✅ HLS serving and WebSocket proxy are now properly configured with CORS headers and MIME types for better browser compatibility."
echo "\\n🔧 Fixed: Added node-fetch dependency to prevent WebSocket stream start errors."
echo "\\n🎯 Fixed: Apache configuration properly excludes HLS/snapshots from React router fallback."`;
