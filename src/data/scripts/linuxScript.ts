
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Linux Installation Script
# Simple deployment approach
set -e

echo "Installing JERICHO Security System..."

# Update system and install dependencies
sudo apt update
sudo apt install -y git apache2 nodejs npm

# Stop Apache and clean web directory
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo chown -R www-data:www-data /var/www/html/

# Remove any existing clone and start fresh
sudo rm -rf jericho-security-system

# Clone, build, and deploy
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git jericho-security-system && \\
cd jericho-security-system && \\
npm install && \\
npm run build && \\
sudo cp -r dist/* /var/www/html/ && \\
cd .. && \\
sudo systemctl restart apache2

echo "Installation complete! Access at http://localhost"
echo "If you get MIME type errors, run: sudo a2enmod rewrite && sudo systemctl restart apache2"`;
