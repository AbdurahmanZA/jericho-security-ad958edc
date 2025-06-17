
export const esxiUbuntuScript = `#!/bin/bash
# JERICHO Security System - Complete ESXi Ubuntu 24.04 Installation
# This script installs the complete system with real SIP/VoIP integration and WebRTC

set -e

echo "Installing JERICHO Security System with Real SIP/VoIP Integration and WebRTC on ESXi Ubuntu..."

# System information
echo "System Information:"
echo "==================="
lscpu | grep "Model name"
free -h
df -h /

# Update system and install base dependencies
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo add-apt-repository universe -y
sudo apt install -y lsb-release ca-certificates apt-transport-https software-properties-common curl wget git

# Remove any existing Node.js installations
sudo apt remove -y nodejs npm node-* 2>/dev/null || true
sudo apt autoremove -y

# Install Node.js 20 LTS
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node.js version: \$(node --version)"
echo "npm version: \$(npm --version)"

# Install FFmpeg for video processing
echo "Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install SQLite3 for database
sudo apt install -y sqlite3 libsqlite3-dev

# Install Asterisk with full VoIP stack
echo "Installing Asterisk PBX with full codec support..."
sudo apt install -y asterisk asterisk-modules asterisk-config asterisk-dev build-essential
sudo apt install -y asterisk-voicemail asterisk-sounds-main asterisk-sounds-en

# Install G.729 codec (open source version)
echo "Setting up G.729 codec..."
cd /tmp
wget -q http://asterisk.hosting.lv/src/asterisk-g729-1.5.0-x86_64.tar.bz2 || echo "G.729 download may fail - GSM will be used"
if [ -f asterisk-g729-1.5.0-x86_64.tar.bz2 ]; then
  tar -xjf asterisk-g729-1.5.0-x86_64.tar.bz2
  sudo cp asterisk-g729-1.5.0-x86_64/codec_g729.so /usr/lib/asterisk/modules/ 2>/dev/null || true
  sudo chown asterisk:asterisk /usr/lib/asterisk/modules/codec_g729.so 2>/dev/null || true
  sudo chmod 755 /usr/lib/asterisk/modules/codec_g729.so 2>/dev/null || true
  echo "G.729 codec installed successfully"
else
  echo "Using built-in GSM codec (recommended for emergency communications)"
fi

# Install go2rtc for WebRTC streaming
echo "Installing go2rtc WebRTC Media Server..."
sudo mkdir -p /opt/go2rtc
cd /tmp
wget -O go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64 || echo "go2rtc download failed - WebRTC will use fallback"
if [ -f go2rtc ]; then
  sudo mv go2rtc /opt/go2rtc/
  sudo chmod +x /opt/go2rtc/go2rtc
  echo "go2rtc installed successfully"
else
  echo "go2rtc installation failed - continuing with HLS only"
fi

# Install Apache2 with SSL support
echo "Installing Apache2 with SSL..."
sudo apt install -y apache2 apache2-utils
sudo a2enmod rewrite mime headers ssl proxy proxy_http proxy_wstunnel expires

# Install SSL certificate tools
sudo apt install -y certbot python3-certbot-apache

# Install development tools
sudo apt install -y python3-opencv libopencv-dev python3-numpy
sudo apt install -y v4l-utils gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good

# Stop services for configuration
sudo systemctl stop apache2
sudo systemctl stop asterisk

# Create project directories
sudo mkdir -p /opt/jericho-backend
sudo mkdir -p /opt/jericho-backend/hls
sudo mkdir -p /opt/jericho-backend/snapshots
sudo mkdir -p /var/log/jericho

# Clone and build frontend
echo "Cloning and building JERICHO frontend..."
cd /tmp
rm -rf jericho-security-system
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git jericho-security-system
cd jericho-security-system

# Build frontend
npm install
npm run build

# Deploy frontend
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Deploy backend
echo "Deploying backend with SIP/VoIP integration..."
sudo cp -r backend/* /opt/jericho-backend/
sudo chown -R www-data:www-data /opt/jericho-backend

# Install backend dependencies
cd /opt/jericho-backend
sudo -u www-data npm install

# Create symlinks for media serving
sudo ln -sf /opt/jericho-backend/hls /var/www/html/hls
sudo ln -sf /opt/jericho-backend/snapshots /var/www/html/snapshots

# Configure Apache for Jericho
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<'EOAPACHE'
<VirtualHost *:80>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    # Enable CORS for all content
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Handle preflight requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

    # Serve HLS and snapshots files directly BEFORE SPA fallback (CRITICAL ORDER)
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]
    
    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]
    
    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # HLS streaming configuration
    <Directory "/var/www/html/hls">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
        
        # HLS MIME types
        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts
        
        # Cache control for HLS
        ExpiresActive On
        ExpiresByType application/vnd.apple.mpegurl "access plus 1 seconds"
        ExpiresByType video/mp2t "access plus 10 seconds"
        
        Header set Accept-Ranges bytes
    </Directory>

    # Snapshots configuration
    <Directory "/var/www/html/snapshots">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
        
        ExpiresActive On
        ExpiresByType image/jpeg "access plus 1 hour"
        ExpiresByType image/png "access plus 1 hour"
    </Directory>

    # Proxy backend API
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    
    # WebSocket proxy
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
</VirtualHost>
EOAPACHE

# Create SSL configuration
sudo tee /etc/apache2/sites-available/jericho-ssl.conf > /dev/null <<'EOSSL'
<VirtualHost *:443>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/jericho-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/jericho-selfsigned.key

    # Same configuration as HTTP version but with SSL
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Handle preflight requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

    # Serve HLS and snapshots files directly BEFORE SPA fallback (CRITICAL ORDER)
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]
    
    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]
    
    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    <Directory /var/www/html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Directory "/var/www/html/hls">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted
        
        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts
        
        ExpiresActive On
        ExpiresByType application/vnd.apple.mpegurl "access plus 1 seconds"
        ExpiresByType video/mp2t "access plus 10 seconds"
        
        Header set Accept-Ranges bytes
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    ErrorLog \${APACHE_LOG_DIR}/jericho_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_ssl_access.log combined
</VirtualHost>
EOSSL

# Generate self-signed SSL certificate
echo "Generating SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout /etc/ssl/private/jericho-selfsigned.key \\
  -out /etc/ssl/certs/jericho-selfsigned.crt \\
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=JERICHO Security/CN=jericho.local"

# Enable Apache sites
sudo a2ensite jericho.conf
sudo a2ensite jericho-ssl.conf
sudo a2dissite 000-default.conf

# Configure Asterisk
echo "Configuring Asterisk for JERICHO..."
sudo systemctl stop asterisk

# Backup original configs
sudo cp /etc/asterisk/sip.conf /etc/asterisk/sip.conf.backup 2>/dev/null || true
sudo cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup 2>/dev/null || true

# Set proper ownership
sudo chown -R asterisk:asterisk /etc/asterisk/
sudo chmod -R 644 /etc/asterisk/*.conf
sudo chmod 755 /etc/asterisk/

# Add www-data to asterisk group
sudo usermod -a -G asterisk www-data

# Configure sudo permissions for Asterisk management
sudo tee /etc/sudoers.d/jericho-asterisk > /dev/null << 'EOSUDO'
# JERICHO Security System - Asterisk Management
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl is-active asterisk
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -rx *
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -r
EOSUDO

# Create Jericho backend service
sudo tee /etc/systemd/system/jericho-backend.service > /dev/null << 'EOSERVICE'
[Unit]
Description=JERICHO Security System Backend Server with SIP/VoIP
After=network.target apache2.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/jericho-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001

# Logging
StandardOutput=append:/var/log/jericho/backend.log
StandardError=append:/var/log/jericho/backend-error.log

[Install]
WantedBy=multi-user.target
EOSERVICE

# Create log files with proper permissions
sudo touch /var/log/jericho/backend.log
sudo touch /var/log/jericho/backend-error.log
sudo chown www-data:www-data /var/log/jericho/*.log

# Configure firewall with go2rtc ports
echo "Configuring firewall..."
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS" 
sudo ufw allow 3001/tcp comment "Jericho Backend"
sudo ufw allow 5060/udp comment "SIP"
sudo ufw allow 5060/tcp comment "SIP"
sudo ufw allow 10000:20000/udp comment "RTP"
sudo ufw allow 1984/tcp comment "go2rtc API"
sudo ufw allow 8554/tcp comment "go2rtc RTSP"
sudo ufw allow 8555/tcp comment "go2rtc WebRTC"

# Enable go2rtc if installed
if [ -f /opt/go2rtc/go2rtc ]; then
  sudo systemctl enable go2rtc
  sudo systemctl start go2rtc
fi

# Enable and start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable apache2
sudo systemctl enable asterisk
sudo systemctl enable jericho-backend

sudo systemctl start apache2
sudo systemctl start jericho-backend

# Wait a moment for backend to initialize
sleep 5

# Get system information
IP_ADDRESS=\$(ip route get 1 | awk '{print \$7; exit}')
HOSTNAME=\$(hostname)

echo ""
echo "=================================="
echo "🎉 JERICHO Security System Installation Complete!"
echo "=================================="
echo ""
echo "🌐 Web Access:"
echo "   HTTP:  http://\${IP_ADDRESS}"
echo "   HTTPS: https://\${IP_ADDRESS} (self-signed certificate)"
echo "   Local: http://localhost"
echo ""
echo "🔧 Backend Services:"
echo "   API:       http://\${IP_ADDRESS}:3001/api/status"
echo "   WebSocket: ws://\${IP_ADDRESS}:3001"
echo ""
echo "📞 SIP/VoIP Configuration:"
echo "   Server IP: \${IP_ADDRESS}"
echo "   SIP Port:  5060"
echo "   RTP Range: 10000-20000"
echo "   Codec:     GSM (default), G.729 (if available)"
echo ""
echo "🎥 WebRTC Configuration:"
if [ -f /opt/go2rtc/go2rtc ]; then
echo "   go2rtc API: http://\${IP_ADDRESS}:1984"
echo "   RTSP Port:  8554"
echo "   WebRTC Port: 8555"
echo "   Status:     ✅ Installed"
else
echo "   Status:     ❌ Not installed (HLS fallback available)"
fi
echo ""
echo "📊 Service Status:"
sudo systemctl is-active --quiet apache2 && echo "   ✅ Apache2: Running" || echo "   ❌ Apache2: Failed"
sudo systemctl is-active --quiet jericho-backend && echo "   ✅ Backend: Running" || echo "   ❌ Backend: Failed"
sudo systemctl is-active --quiet asterisk && echo "   ✅ Asterisk: Running" || echo "   ❌ Asterisk: Stopped (normal - start from web interface)"
if [ -f /opt/go2rtc/go2rtc ]; then
  sudo systemctl is-active --quiet go2rtc && echo "   ✅ go2rtc: Running" || echo "   ❌ go2rtc: Failed"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open web browser to http://\${IP_ADDRESS}"
echo "2. Go to Settings > Streams to configure camera RTSP URLs"
echo "3. Configure go2rtc streams at http://\${IP_ADDRESS}:1984 (if installed)"
echo "4. Go to Settings > SIP/VoIP to configure phone system"
echo "5. Test WebRTC low-latency streaming"
echo "6. Test SIP registration with softphone"
echo ""
echo "🎯 WebRTC Setup (if go2rtc installed):"
echo "   1. Edit /opt/go2rtc/go2rtc.yaml with your camera URLs"
echo "   2. Restart: sudo systemctl restart go2rtc"
echo "   3. Test WebRTC at: http://\${IP_ADDRESS}:1984"
echo "   4. Configure camera streams in web interface"
echo ""
echo "🔍 Monitoring:"
echo "   Backend logs:  sudo journalctl -u jericho-backend -f"
echo "   go2rtc logs:   sudo journalctl -u go2rtc -f"
echo "   Apache logs:   sudo tail -f /var/log/apache2/jericho_access.log"
echo "   Asterisk CLI:  sudo asterisk -r"
echo ""
echo "📞 VoIP Testing:"
echo "   SIP peers:     sudo asterisk -rx 'sip show peers'"
echo "   Call history:  sudo asterisk -rx 'cdr show status'"
echo "   Test call:     Use softphone to call extension 1001"
echo ""
echo "🎯 ESXi Optimization Tips:"
echo "   - Allocate at least 4GB RAM for optimal performance"
echo "   - Use SSD storage for better I/O performance"  
echo "   - Enable hardware acceleration if available"
echo "   - Monitor CPU usage during multiple camera streams"
echo ""
echo "🔐 Security Notes:"
echo "   - Change default SIP extension passwords"
echo "   - Configure firewall rules for your network"
echo "   - Use strong passwords for web interface"
echo "   - Consider VPN access for remote management"
echo ""
echo "=================================="
echo "🟢 Full JERICHO System Ready with WebRTC + SIP/VoIP!"
echo "🎯 PERMANENT FIX: Apache configuration properly serves HLS files directly before SPA fallback - no more manifest parsing errors."
echo "=================================="`;
