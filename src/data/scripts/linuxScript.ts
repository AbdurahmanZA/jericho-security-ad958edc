
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Ubuntu 24.04 Complete Installation Script (with HTTPS/FFmpeg)
# Includes frontend, backend server, RTSP processing modules, and HTTPS support

set -e

echo "Installing JERICHO Security System with Backend Server..."

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

# Install OpenCV dependencies for motion detection
sudo apt install -y python3-opencv libopencv-dev python3-numpy

# Install additional media processing tools
sudo apt install -y v4l-utils gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad

# Install Apache2, Git, Certbot (HTTPS)
sudo apt install -y apache2 git build-essential python3 python3-pip certbot python3-certbot-apache

echo "FFmpeg version: \$(ffmpeg -version | head -n1)"

# Enable Apache modules (HTTP + HTTPS)
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

# Install backend dependencies
echo "Installing backend dependencies..."
cd /opt/jericho-backend
sudo npm install

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
  echo "Attempting to set up HTTPS for \$DOMAIN using Let's Encrypt (certbot)..."
  sudo certbot --apache --non-interactive --agree-tos -m youremail@example.com -d \$DOMAIN || true
  # Fallback if certbot fails or you don't have a public domain:
  if [ ! -f /etc/ssl/certs/jericho-selfsigned.crt ]; then
    echo "Certbot failed or no valid domain, generating self-signed certificate for Apache..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
      -keyout /etc/ssl/private/jericho-selfsigned.key \\
      -out /etc/ssl/certs/jericho-selfsigned.crt \\
      -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=jericho.local"
  fi

  sudo tee \$APACHE_SSL_CONF > /dev/null <<'EOSSLCONF'
<VirtualHost *:443>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/jericho-selfsigned.crt
    SSLCertificateKeyFile /etc/ssl/private/jericho-selfsigned.key

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks
    </Directory>

    # Proxy settings for backend API, HLS, WebSocket, etc.
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    ProxyPass /hls/ http://localhost:3001/hls/
    ProxyPassReverse /hls/ http://localhost:3001/hls/
    ProxyPass /snapshots/ http://localhost:3001/snapshots/
    ProxyPassReverse /snapshots/ http://localhost:3001/snapshots/
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOSSLCONF
  sudo a2ensite jericho-ssl.conf
fi

# Always enable and reload Apache configs, HTTP and HTTPS
sudo systemctl daemon-reload
sudo systemctl enable jericho-backend
sudo systemctl start jericho-backend
sudo a2enmod ssl
sudo systemctl restart apache2

# Configure firewall for HTTP and HTTPS
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
echo "\\n📁 Backend logs:"
echo "sudo journalctl -u jericho-backend -f"
echo "\\n🔧 Backend directory: /opt/jericho-backend"
echo "=================================="

echo "\\n🟢 HTTPS ACCESS: If you set up a DNS record to point to your server, replace 'jericho.local' with your domain and reissue the cert (see comments in script)."
echo "\\n🔄 Certbot auto-renew is set up by default via cron; self-signed certs will need periodic renewal by rerunning openssl commands above if desired."
`
