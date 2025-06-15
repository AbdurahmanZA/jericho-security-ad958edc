
export const installationScripts = {
  linux: `#!/bin/bash
# JERICHO Security System - Simple Ubuntu Installation Script
set -e

echo "Starting JERICHO Security System installation..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system and install prerequisites
echo "Installing prerequisites..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git apache2 nodejs npm

# Check Node.js version (requires 16+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Stop Apache and clean directory
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo chown -R $USER:www-data /var/www/html/

# Install directly from GitHub using npm
echo "Installing JERICHO Security System from GitHub..."
cd /tmp
rm -rf jericho-install
mkdir jericho-install && cd jericho-install

# Use npm to install from GitHub - this handles everything
npm install github:AbdurahmanZA/jericho-security-ad958edc
cd node_modules/jericho-security-ad958edc
npm run build

# Deploy to Apache
echo "Deploying to web server..."
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Simple Apache configuration
echo "Configuring Apache..."
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<EOF
<VirtualHost *:80>
    DocumentRoot /var/www/html
    
    # Enable rewrite for React Router
    <Directory /var/www/html>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Enable site and restart Apache
sudo a2enmod rewrite
sudo a2ensite jericho.conf
sudo a2dissite 000-default.conf
sudo systemctl restart apache2
sudo systemctl enable apache2

# Cleanup
cd /
rm -rf /tmp/jericho-install

echo "Installation completed successfully!"
echo "JERICHO Security System is available at: http://$(hostname -I | awk '{print $1}')"
echo "Local access: http://localhost"`,

  windows: `@echo off
REM JERICHO Security System - Simple Windows Installation
echo Installing JERICHO Security System...

REM Stop IIS
iisreset /stop

REM Clean directory
rmdir /s /q "C:\\inetpub\\wwwroot"
mkdir "C:\\inetpub\\wwwroot"

REM Install from GitHub using npm
cd /d "%TEMP%"
rmdir /s /q jericho-install 2>nul
mkdir jericho-install
cd jericho-install

npm install github:AbdurahmanZA/jericho-security-ad958edc
cd node_modules\\jericho-security-ad958edc
npm run build

REM Deploy
xcopy /s /y dist\\* "C:\\inetpub\\wwwroot\\"

REM Start IIS
iisreset /start

echo Installation complete! Access at http://localhost`,

  macos: `#!/bin/bash
# JERICHO Security System - Simple macOS Installation
set -e

echo "Installing JERICHO Security System..."

# Install Homebrew if needed
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install nginx
brew install nginx

# Stop nginx
sudo brew services stop nginx

# Install from GitHub using npm
cd /tmp
rm -rf jericho-install
mkdir jericho-install && cd jericho-install

npm install github:AbdurahmanZA/jericho-security-ad958edc
cd node_modules/jericho-security-ad958edc
npm run build

# Deploy
sudo rm -rf /usr/local/var/www/*
sudo cp -r dist/* /usr/local/var/www/

# Start nginx
sudo brew services start nginx

echo "Installation complete! Access at http://localhost:8080"`,

  docker: `# JERICHO Security System - Docker Installation
# Pull and run the official Docker image

docker stop jericho-security 2>/dev/null || true
docker rm jericho-security 2>/dev/null || true

docker run -d \\
  --name jericho-security \\
  -p 80:80 \\
  -p 3001:3001 \\
  -v jericho-data:/app/data \\
  --restart unless-stopped \\
  abdurahmanza/jericho-security-system:latest

echo "JERICHO Security System is running at http://localhost"`,

  dockerCompose: `version: '3.8'

services:
  jericho-security:
    image: abdurahmanza/jericho-security-system:latest
    container_name: jericho-security
    ports:
      - "80:80"
      - "3001:3001"
    volumes:
      - jericho-data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  jericho-data:`
};

export const scriptMetadata = {
  linux: {
    title: "Ubuntu/Debian Installation",
    description: "Simplified installation using npm's GitHub integration. Installs directly from the repository.",
    prerequisites: "Ubuntu 18.04+ with sudo privileges",
    usage: "Save as install.sh, make executable: chmod +x install.sh, then run: ./install.sh",
    features: [
      "Uses npm's built-in GitHub installation",
      "Automatic dependency resolution",
      "Simple Apache configuration",
      "Minimal setup with maximum reliability",
      "Easy to maintain and debug"
    ]
  },
  windows: {
    title: "Windows Installation", 
    description: "Simple batch script using npm GitHub installation with IIS.",
    prerequisites: "Git, Node.js, npm, IIS",
    usage: "Save as install.bat and run as Administrator"
  },
  macos: {
    title: "macOS Installation",
    description: "Simplified installation using npm and Homebrew with nginx.",
    prerequisites: "Xcode Command Line Tools",
    usage: "Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh"
  },
  docker: {
    title: "Docker Installation",
    description: "Simple Docker run command for immediate deployment.",
    prerequisites: "Docker Engine",
    ports: "80 (Web UI), 3001 (WebSocket)"
  },
  compose: {
    title: "Docker Compose",
    description: "Minimal docker-compose.yml for production deployment.",
    prerequisites: "Docker, Docker Compose", 
    usage: "Save as docker-compose.yml, then run docker-compose up -d"
  }
};
