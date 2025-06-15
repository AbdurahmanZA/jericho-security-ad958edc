
export const installationScripts = {
  linux: `#!/bin/bash
# JERICHO Security System - Ubuntu Installation Script
set -e  # Exit on any error

echo "Starting JERICHO Security System installation..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install prerequisites
echo "Installing prerequisites..."
sudo apt install -y curl git apache2 nodejs npm

# Check Node.js version (requires 16+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Stop Apache if running
echo "Stopping Apache..."
sudo systemctl stop apache2

# Clean web directory
echo "Cleaning web directory..."
sudo rm -rf /var/www/html/*

# Set proper ownership
sudo chown -R $USER:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Remove old installation
echo "Removing old installation..."
rm -rf jericho-security-ad958edc

# Clone repository
echo "Cloning JERICHO Security System..."
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git
cd jericho-security-ad958edc/

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Build application
echo "Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Build failed - dist directory not found"
    exit 1
fi

# Copy build files to Apache directory
echo "Deploying to Apache..."
sudo cp -r dist/* /var/www/html/

# Ensure index.html exists
if [ ! -f "/var/www/html/index.html" ]; then
    echo "Warning: index.html not found in build output"
    echo "Creating fallback index.html..."
    sudo tee /var/www/html/index.html > /dev/null <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JERICHO Security System</title>
</head>
<body>
    <div id="root">
        <h1>JERICHO Security System</h1>
        <p>If you see this message, the build deployment may have failed.</p>
        <p>Please check the installation logs and try again.</p>
    </div>
</body>
</html>
EOF
fi

# Configure Apache
echo "Configuring Apache..."
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<EOF
<VirtualHost *:80>
    ServerAdmin admin@localhost
    DocumentRoot /var/www/html
    
    # MIME type configuration - must be set globally
    AddType text/css .css
    AddType application/javascript .js
    AddType application/json .json
    AddType image/svg+xml .svg
    AddType font/woff .woff
    AddType font/woff2 .woff2
    
    # Main directory configuration
    <Directory "/var/www/html">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Serve static files directly - no rewrite for existing files
        RewriteEngine On
        
        # Don't rewrite files that exist (including assets)
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        
        # Don't rewrite asset files specifically
        RewriteCond %{REQUEST_URI} !^/assets/
        RewriteCond %{REQUEST_URI} !\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|json)$
        
        # Only rewrite to index.html for non-existing files that aren't assets
        RewriteRule . /index.html [L]
        
        # Cache control for static assets
        <FilesMatch "\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
            ExpiresActive On
            ExpiresDefault "access plus 1 month"
            Header append Cache-Control "public"
        </FilesMatch>
    </Directory>
    
    # Explicit assets directory configuration
    <Directory "/var/www/html/assets">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        
        # Disable rewrite engine for assets directory
        RewriteEngine Off
        
        # Force correct MIME types
        <FilesMatch "\\.css$">
            ForceType text/css
        </FilesMatch>
        <FilesMatch "\\.js$">
            ForceType application/javascript
        </FilesMatch>
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    ErrorLog \${APACHE_LOG_DIR}/jericho_error.log
    CustomLog \${APACHE_LOG_DIR}/jericho_access.log combined
</VirtualHost>
EOF

# Enable required Apache modules
echo "Enabling Apache modules..."
sudo a2enmod rewrite headers expires mime
sudo a2ensite jericho.conf
sudo a2dissite 000-default.conf

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 644 /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \\;

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 'Apache Full'

# Test Apache configuration
echo "Testing Apache configuration..."
sudo apache2ctl configtest

# Start Apache
echo "Starting Apache..."
sudo systemctl enable apache2
sudo systemctl start apache2

# Debug: List actual files in assets directory
echo "Checking deployed files..."
echo "Contents of /var/www/html/:"
ls -la /var/www/html/
echo "Contents of /var/www/html/assets/:"
ls -la /var/www/html/assets/

# Cleanup
cd ..
rm -rf jericho-security-ad958edc/

# Display status
echo "Installation completed successfully!"
echo "JERICHO Security System is now available at: http://$(hostname -I | awk '{print $1}')"
echo "Local access: http://localhost"
echo ""
echo "Checking deployment status..."
if curl -f -s http://localhost > /dev/null; then
    echo "✓ Web server is responding"
    echo "Testing asset serving..."
    ASSET_FILE=$(ls /var/www/html/assets/*.css | head -1 | xargs basename)
    if [ ! -z "$ASSET_FILE" ]; then
        echo "Testing CSS file: $ASSET_FILE"
        curl -I "http://localhost/assets/$ASSET_FILE" | grep -E "(HTTP|Content-Type)"
    fi
else
    echo "✗ Web server is not responding - check Apache logs:"
    echo "  sudo tail -f /var/log/apache2/jericho_error.log"
fi
echo ""
echo "Next steps:"
echo "1. Configure your camera RTSP URLs in the web interface"
echo "2. Set up SSL certificate for HTTPS (recommended for production)"
echo "3. Configure backup and monitoring"`,

  windows: `@echo off
REM JERICHO Security System - Windows Installation Script
echo Stopping IIS if running...
iisreset /stop

echo Cleaning web directory...
rmdir /s /q "C:\\inetpub\\wwwroot\\*"

echo Removing old installation...
rmdir /s /q jericho-security-ad958edc

echo Cloning repository...
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git
cd jericho-security-ad958edc

echo Installing dependencies...
npm install

echo Building application...
npm run build

echo Copying files to web directory...
xcopy /s /y dist\\* "C:\\inetpub\\wwwroot\\"

echo Starting IIS...
iisreset /start

echo Installation complete!`,

  macos: `#!/bin/bash
# JERICHO Security System - macOS Installation Script
# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    brew install nginx
fi

# Stop nginx
sudo brew services stop nginx

# Clean web directory
sudo rm -rf /usr/local/var/www/*
sudo rm -rf jericho-security-ad958edc

# Clone and build
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git && \\
cd jericho-security-ad958edc/ && \\
npm install && \\
npm run build && \\
sudo cp -r dist/* /usr/local/var/www/ && \\
sudo brew services start nginx`,

  docker: `# JERICHO Security System - Docker Installation
# Create docker-compose.yml file first, then run:

docker-compose down
docker-compose pull
docker-compose up -d

# Or using Docker directly:
docker stop jericho-security || true
docker rm jericho-security || true
docker pull abdurahmanza/jericho-security-system:latest
docker run -d \\
  --name jericho-security \\
  -p 3000:3000 \\
  -p 3001:3001 \\
  -v jericho-data:/app/data \\
  --restart unless-stopped \\
  abdurahmanza/jericho-security-system:latest`,

  dockerCompose: `version: '3.8'

services:
  jericho-security:
    image: abdurahmanza/jericho-security-system:latest
    container_name: jericho-security
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - jericho-data:/app/data
      - jericho-config:/app/config
    environment:
      - NODE_ENV=production
      - WEBSOCKET_PORT=3001
    restart: unless-stopped
    networks:
      - jericho-network

  nginx:
    image: nginx:alpine
    container_name: jericho-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - jericho-security
    networks:
      - jericho-network

volumes:
  jericho-data:
  jericho-config:

networks:
  jericho-network:
    driver: bridge`
};

export const scriptMetadata = {
  linux: {
    title: "Ubuntu/Debian Installation",
    description: "Production-ready bash script with error handling, security configurations, and Apache setup.",
    prerequisites: "Ubuntu 18.04+ with sudo privileges",
    usage: "Save as install.sh, make executable: chmod +x install.sh, then run: ./install.sh",
    features: [
      "Updates system packages",
      "Installs Node.js 18 LTS, Apache2, and dependencies",
      "Configures Apache with React Router support",
      "Sets up security headers and firewall rules",
      "Enables automatic startup",
      "Includes deployment verification",
      "Configures proper MIME types for modern web assets",
      "Fixes asset serving with proper rewrite rules"
    ]
  },
  windows: {
    title: "Windows Installation",
    description: "Batch script for IIS web server deployment. Run as Administrator.",
    prerequisites: "Git, Node.js, npm, IIS",
    usage: "Save as install.bat and run as Administrator"
  },
  macos: {
    title: "macOS Installation",
    description: "Bash script using Homebrew and Nginx. Installs dependencies automatically.",
    prerequisites: "Xcode Command Line Tools",
    usage: "Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh"
  },
  docker: {
    title: "Docker Installation",
    description: "Docker commands for containerized deployment. Cross-platform solution.",
    prerequisites: "Docker Engine",
    ports: "3000 (Web UI), 3001 (WebSocket)"
  },
  compose: {
    title: "Docker Compose",
    description: "Complete docker-compose.yml for production deployment with Nginx reverse proxy.",
    prerequisites: "Docker, Docker Compose",
    usage: "Save as docker-compose.yml, then run docker-compose up -d"
  }
};
