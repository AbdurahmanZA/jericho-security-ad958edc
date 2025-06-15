


export const linuxScript = `#!/bin/bash
# JERICHO Security System - Linux Installation Script
# Simple deployment approach with proper Apache configuration
set -e

echo "Installing JERICHO Security System..."

# Update system and install dependencies
sudo apt update
sudo apt install -y git apache2 nodejs npm

# Enable Apache modules first
sudo a2enmod rewrite
sudo a2enmod mime
sudo a2enmod headers

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

# Create .htaccess file for better asset handling
sudo tee /var/www/html/.htaccess > /dev/null <<'EOF'
# Enable rewrite engine
RewriteEngine On

# Handle Angular and React Router - send everything to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^.*$ /index.html [QSA,L]

# Force correct MIME types for assets
<FilesMatch "\\.css$">
    ForceType text/css
</FilesMatch>

<FilesMatch "\\.js$">
    ForceType application/javascript
</FilesMatch>

<FilesMatch "\\.json$">
    ForceType application/json
</FilesMatch>

# Set proper headers for assets
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000"
    Header unset ETag
</FilesMatch>
EOF

# Configure Apache virtual host with proper settings
sudo tee /etc/apache2/sites-available/000-default.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName jericho-security
    ServerAlias 192.168.0.138

    # Enable required modules
    RewriteEngine On

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks

        # Ensure proper MIME types
        AddType text/css .css
        AddType application/javascript .js
        AddType application/json .json

        # SPA fallback
        FallbackResource /index.html
    </Directory>

    # Handle assets directory specifically
    <Directory /var/www/html/assets>
        Options -Indexes
        AllowOverride None
        Require all granted

        # Disable fallback for assets
        RewriteEngine Off
    </Directory>

    # Error and access logs
    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 644 /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \\;

# Restart Apache
sudo systemctl restart apache2

echo "Installation complete! Access at http://localhost"
echo "Apache configured with proper MIME types and asset handling"
echo "Check Apache error logs if issues persist: sudo tail -f /var/log/apache2/error.log"`;


