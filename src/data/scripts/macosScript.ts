
export const macosScript = `#!/bin/bash
# JERICHO Security System - macOS Installation
set -e

echo "Installing JERICHO Security System..."

# Install Homebrew if needed
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install nginx and Node.js
brew install nginx nodejs npm

# Install globally from GitHub using npm
npm install -g github:AbdurahmanZA/jericho-security-ad958edc

# Stop nginx
sudo brew services stop nginx

# Deploy
sudo rm -rf /usr/local/var/www/*
NPM_GLOBAL_PATH=$(npm root -g)
sudo cp -r "$NPM_GLOBAL_PATH/jericho-security-ad958edc/dist/"* /usr/local/var/www/

# Start nginx
sudo brew services start nginx

echo "Installation complete! Access at http://localhost:8080"`;
