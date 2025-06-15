
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
rm -rf jericho-security-system

# Clone repository (replace with actual repo URL)
echo "Cloning JERICHO Security System..."
git clone https://github.com/yourusername/jericho-security-system.git
cd jericho-security-system/

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Build application
echo "Building application..."
npm run build

# Copy build files to Apache directory
echo "Deploying to Apache..."
sudo cp -r dist/* /var/www/html/

# Configure Apache
echo "Configuring Apache..."
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<EOF
<VirtualHost *:80>
    ServerAdmin admin@localhost
    DocumentRoot /var/www/html
    
    # Enable mod_rewrite for React Router
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
    
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
sudo a2enmod rewrite headers
sudo a2ensite jericho.conf
sudo a2dissite 000-default.conf

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 644 /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \\;

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow 'Apache Full'

# Start Apache
echo "Starting Apache..."
sudo systemctl enable apache2
sudo systemctl start apache2

# Cleanup
cd ..
rm -rf jericho-security-system/

echo "Installation completed successfully!"
echo "JERICHO Security System is now available at: http://$(hostname -I | awk '{print $1}')"
echo "Local access: http://localhost"
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
      "Enables automatic startup"
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
