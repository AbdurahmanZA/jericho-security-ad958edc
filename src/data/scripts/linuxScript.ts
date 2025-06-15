

export const linuxScript = `#!/bin/bash
# JERICHO Security System - Linux Installation Script
# Simple deployment approach with proper Apache configuration
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
cd ..

# Configure Apache for SPA with proper MIME types
sudo tee /etc/apache2/sites-available/000-default.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName localhost
    
    # Enable required modules
    RewriteEngine On
    
    # SPA routing - redirect all requests to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]
    
    # Proper MIME types for assets
    <FilesMatch "\\.(css)$">
        ForceType text/css
    </FilesMatch>
    
    <FilesMatch "\\.(js)$">
        ForceType application/javascript
    </FilesMatch>
    
    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks
    </Directory>
</VirtualHost>
EOF

# Enable Apache modules and restart
sudo a2enmod rewrite
sudo a2enmod mime
sudo systemctl restart apache2

echo "Installation complete! Access at http://localhost"
echo "Apache configured with proper MIME types and SPA routing"`;

