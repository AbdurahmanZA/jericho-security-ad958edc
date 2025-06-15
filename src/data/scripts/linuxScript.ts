
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
sudo apt install -y curl git apache2 nodejs npm unzip

# Check Node.js version (requires 16+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Clean up any previous installations
echo "Cleaning up previous installations..."
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo npm uninstall -g jericho-security-system 2>/dev/null || true
sudo rm -rf /usr/local/lib/node_modules/jericho-security-system 2>/dev/null || true

# Create temporary directory for installation
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download and extract the latest release
echo "Downloading JERICHO Security System..."
# Replace with your actual GitHub repository URL
REPO_URL="https://github.com/YOUR_USERNAME/jericho-security-system"
git clone "$REPO_URL.git" jericho-security-system

cd jericho-security-system

# Install dependencies and build
echo "Building application..."
npm install
npm run build

# Deploy to Apache
echo "Deploying to web server..."
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Configure Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# Open firewall ports
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "Installation completed successfully!"
echo "JERICHO Security System is available at: http://$(hostname -I | awk '{print $1}')"
echo "Local access: http://localhost"
echo ""
echo "NOTE: Update the REPO_URL variable in this script with your actual GitHub repository URL"`;
