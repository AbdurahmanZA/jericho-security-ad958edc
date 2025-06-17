
export const esxiUbuntuScript = `#!/bin/bash
# JERICHO Security System - ESXi Ubuntu 24.04 Production Installation
# Updated with all latest fixes and enterprise-grade configuration

set -e

echo "========================================"
echo "JERICHO Security System - ESXi Production"
echo "Ubuntu 24.04 LTS Enterprise Installation"
echo "========================================"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please do not run this script as root. Use a sudo-enabled user."
    exit 1
fi

# Update system
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y git nodejs npm apache2 ffmpeg sqlite3 build-essential curl wget unzip \
    fail2ban ufw certbot python3-certbot-apache htop tree vim

# Install Node.js 18+ if needed
if ! node --version | grep -q "v1[89]\\|v[2-9][0-9]"; then
    echo "🟢 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Configure enhanced security
echo "🔐 Configuring enhanced security..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure UFW firewall for enterprise
echo "🔥 Configuring enterprise firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 3001/tcp comment "Backend API"
sudo ufw allow 5060/udp comment "SIP"
sudo ufw allow 10000:20000/udp comment "RTP"
sudo ufw --force enable

# Enable required Apache modules
echo "🔧 Configuring Apache modules..."
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod ssl
sudo a2enmod expires

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
sudo npm install --production

# Build frontend
echo "🏗️ Building frontend application..."
sudo npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
sudo npm install --production
cd ..

# Set proper ownership
sudo chown -R www-data:www-data "$INSTALL_DIR"

# Deploy frontend to Apache
echo "🚀 Deploying frontend to Apache..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Create production Apache virtual host
echo "⚙️ Configuring production Apache virtual host..."
sudo tee /etc/apache2/sites-available/jericho-security.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    # Redirect all HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/jericho-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/jericho-selfsigned.key

    # Security headers
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Enable CORS for camera streams
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

    # Enable compression
    LoadModule deflate_module modules/mod_deflate.so
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \\.(?:gif|jpe?g|png)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \\.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
    </Location>

    # Enable rewrite engine
    RewriteEngine On

    # Serve HLS and snapshots files directly
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]

    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]

    # Exclude /assets/ from SPA fallback
    RewriteCond %{REQUEST_URI} ^/assets/
    RewriteRule .* - [L]

    # SPA fallback
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    # MIME types
    AddType application/javascript .js
    AddType text/css .css
    AddType application/json .json

    # HLS configuration
    <Directory "/var/www/html/hls">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts

        ExpiresActive On
        ExpiresByType application/vnd.apple.mpegurl "access plus 1 seconds"
        ExpiresByType video/mp2t "access plus 10 seconds"

        Header set Accept-Ranges bytes
        Header set Cache-Control "no-cache, must-revalidate"
    </Directory>

    <Directory "/var/www/html/snapshots">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        ExpiresActive On
        ExpiresByType image/jpeg "access plus 1 hour"
        ExpiresByType image/png "access plus 1 hour"
    </Directory>

    <Directory "/var/www/html/assets">
        Options -Indexes
        AllowOverride None
        Require all granted

        <FilesMatch "\\.(js|css|json)$">
            ExpiresActive On
            ExpiresDefault "access plus 1 year"
        </FilesMatch>

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

    <Directory "/var/www/html">
        AllowOverride All
        Require all granted
    </Directory>

    # Backend proxy configuration
    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket proxy (using ws:// for internal communication)
    ProxyPass /api/ws ws://localhost:3001/api/ws
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws

    # HTTP API proxy
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
</VirtualHost>
EOF

# Generate self-signed SSL certificate
echo "🔐 Generating SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/jericho-selfsigned.key \
    -out /etc/ssl/certs/jericho-selfsigned.crt \
    -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=JERICHO Security/CN=jericho.local"

# Configure sites
sudo a2dissite 000-default.conf || true
sudo a2dissite jericho.conf || true
sudo a2ensite jericho-security.conf

# Create production systemd service
echo "⚙️ Creating production backend service..."
sudo tee /etc/systemd/system/jericho-backend.service > /dev/null << EOF
[Unit]
Description=JERICHO Security Backend Server
After=network.target apache2.service
Wants=apache2.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR /var/www/html/hls /var/www/html/snapshots

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Install Asterisk for enterprise VoIP
echo "📞 Installing Asterisk for enterprise VoIP..."
sudo apt install -y asterisk asterisk-modules asterisk-config asterisk-dev

# Create production directories
echo "📁 Creating production directories..."
sudo mkdir -p /var/www/html/hls
sudo mkdir -p /var/www/html/snapshots
sudo mkdir -p /var/log/jericho
sudo chown -R www-data:www-data /var/www/html/hls
sudo chown -R www-data:www-data /var/www/html/snapshots
sudo chown -R www-data:www-data /var/log/jericho

# Configure log rotation
echo "📊 Configuring log rotation..."
sudo tee /etc/logrotate.d/jericho > /dev/null << 'EOF'
/var/log/jericho/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload jericho-backend
    endscript
}
EOF

# Configure sudo permissions
sudo tee /etc/sudoers.d/jericho-backend > /dev/null << 'EOF'
# JERICHO Security System permissions
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart jericho-backend
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status jericho-backend
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -rx *
EOF

# Enable and start services
echo "🚀 Starting production services..."
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo systemctl restart apache2

# Test services
echo "🧪 Testing services..."
sleep 5

if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "✅ Backend service is running"
else
    echo "⚠️ Backend service may need troubleshooting"
    sudo journalctl -u jericho-backend --no-pager -n 20
fi

if curl -f https://localhost -k > /dev/null 2>&1; then
    echo "✅ HTTPS frontend is accessible"
else
    echo "⚠️ HTTPS frontend may need troubleshooting"
fi

echo "========================================"
echo "✅ JERICHO Security System - Production Ready!"
echo "========================================"
echo "🌐 Frontend: https://localhost (HTTPS with self-signed cert)"
echo "🔧 Backend API: http://localhost:3001/api/status"
echo "📁 Installation: $INSTALL_DIR"
echo "📊 Logs: sudo journalctl -u jericho-backend -f"
echo "🔐 SSL: Self-signed certificate installed"
echo ""
echo "🎯 Production Features:"
echo "• ✅ HTTPS with SSL redirect"
echo "• ✅ Security headers and hardening"
echo "• ✅ Firewall configured (UFW)"
echo "• ✅ Fail2ban intrusion detection"
echo "• ✅ Log rotation configured"
echo "• ✅ Resource limits applied"
echo "• ✅ WebSocket proxy (ws:// internal)"
echo "• ✅ HLS streaming optimized"
echo "• ✅ Asterisk VoIP ready"
echo ""
echo "🔧 Management Commands:"
echo "• Backend status: sudo systemctl status jericho-backend"
echo "• Backend logs: sudo journalctl -u jericho-backend -f"
echo "• Apache logs: sudo tail -f /var/log/apache2/jericho_error.log"
echo "• Firewall status: sudo ufw status"
echo "• SSL certificate: openssl x509 -in /etc/ssl/certs/jericho-selfsigned.crt -text -noout"
echo ""
echo "🚨 Security Notes:"
echo "• Change default passwords immediately"
echo "• Configure Let's Encrypt for production SSL"
echo "• Review firewall rules for your network"
echo "• Monitor logs regularly"
echo "• Update system packages regularly"
echo "========================================"
`;
