
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Ubuntu Installation Script
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

# Install directly from GitHub using npm
echo "Installing JERICHO Security System from GitHub..."
sudo npm install -g github:AbdurahmanZA/jericho-security-ad958edc

# Deploy to Apache
echo "Deploying to web server..."
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*

# Copy files from global npm installation
NPM_GLOBAL_PATH=$(npm root -g)
sudo cp -r "$NPM_GLOBAL_PATH/jericho-security-ad958edc/dist/"* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Configure Apache
sudo systemctl start apache2
sudo systemctl enable apache2

echo "Installation completed successfully!"
echo "JERICHO Security System is available at: http://$(hostname -I | awk '{print $1}')"
echo "Local access: http://localhost"`;
