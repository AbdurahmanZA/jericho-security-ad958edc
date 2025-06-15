
export const linuxScript = `#!/bin/bash
# JERICHO Security System - Linux Installation Script
set -e

echo "Installing JERICHO Security System..."

# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git apache2 nodejs npm

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "Downloading JERICHO Security System..."
REPO_URL="https://github.com/AbdurahmanZA/jericho-security-ad958edc.git"

if git clone "$REPO_URL" jericho-security-system; then
    echo "Repository cloned successfully"
else
    echo "Failed to clone repository. Please check your Git credentials."
    exit 1
fi

cd jericho-security-system

# Install and build (standard Lovable app approach)
echo "Installing dependencies and building..."
npm install
npm run build

# Verify build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "ERROR: Build failed"
    exit 1
fi

# Deploy to Apache
echo "Deploying to Apache..."
sudo systemctl stop apache2
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Simple Apache SPA configuration
sudo tee /etc/apache2/sites-available/jericho.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName localhost
    
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

# Enable Apache modules and site
sudo a2enmod rewrite
sudo a2dissite 000-default
sudo a2ensite jericho

# Set permissions and start
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo systemctl start apache2
sudo systemctl enable apache2

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "Installation complete! Access at http://localhost"`;
