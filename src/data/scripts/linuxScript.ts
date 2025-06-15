
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

# Create temporary directory for installation
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download and extract the application
echo "Downloading JERICHO Security System..."
REPO_URL="https://github.com/AbdurahmanZA/jericho-security-ad958edc.git"

# Try to clone the repository
if git clone "$REPO_URL" jericho-security-system; then
    echo "Repository cloned successfully"
else
    echo "Failed to clone repository. Please ensure:"
    echo "1. The repository URL is correct"
    echo "2. You have access to the repository"
    echo "3. Git credentials are configured if repository is private"
    exit 1
fi

cd jericho-security-system

# Install dependencies and build
echo "Installing dependencies..."
npm install

echo "Building application..."
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
echo "If you encountered authentication issues, you may need to:"
echo "1. Configure Git credentials: git config --global user.name 'Your Name'"
echo "2. Set up SSH keys or personal access tokens for private repositories"`;
