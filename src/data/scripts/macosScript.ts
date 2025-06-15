
export const macosScript = `#!/bin/bash
# JERICHO Security System - macOS Installation
set -e

echo "Installing JERICHO Security System..."

# Install Homebrew if needed
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install nginx and Node.js
brew install nginx nodejs npm git

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download and extract from GitHub
echo "Downloading JERICHO Security System..."
# Replace with your actual GitHub repository URL
REPO_URL="https://github.com/YOUR_USERNAME/jericho-security-system"
git clone "$REPO_URL.git" jericho-security-system

cd jericho-security-system

# Install dependencies and build
echo "Building application..."
npm install
npm run build

# Stop nginx
sudo brew services stop nginx

# Deploy
sudo rm -rf /usr/local/var/www/*
sudo cp -r dist/* /usr/local/var/www/

# Start nginx
sudo brew services start nginx

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "Installation complete! Access at http://localhost:8080"
echo "NOTE: Update the REPO_URL variable in this script with your actual GitHub repository URL"`;
