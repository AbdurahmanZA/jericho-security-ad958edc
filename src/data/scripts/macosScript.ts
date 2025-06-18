
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
echo ""
echo "If you encountered authentication issues:"
echo "- Configure Git credentials or SSH keys"
echo "- Use personal access tokens for private repositories"`;
