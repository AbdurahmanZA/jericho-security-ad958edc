
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

# Clone from GitHub repository
echo "Downloading JERICHO Security System..."
REPO_URL="https://github.com/AbdurahmanZA/jericho-security-ad958edc.git"

if git clone "$REPO_URL" jericho-security-system; then
    echo "Repository cloned successfully"
else
    echo "Failed to clone repository. Please ensure:"
    echo "1. You have access to the repository"
    echo "2. Git credentials are configured if repository is private"
    echo "3. Use: git config --global credential.helper store"
    echo "4. Or setup SSH keys for GitHub access"
    exit 1
fi

cd jericho-security-system

# Install dependencies and build
echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

# Stop Apache
sudo systemctl stop apache2

# Clean and deploy
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Create proper Apache configuration for SPA
sudo tee /etc/apache2/sites-available/jericho-security.conf > /dev/null <<EOF
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName localhost
    
    # Enable rewrite module for SPA routing
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*\$ /index.html [QSA,L]
    
    # Set proper MIME types
    <LocationMatch "\\.(css|js|map|json|ico|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$">
        Header always set Cache-Control "public, max-age=31536000"
    </LocationMatch>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/plain
        AddOutputFilterByType DEFLATE text/html
        AddOutputFilterByType DEFLATE text/xml
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/xml
        AddOutputFilterByType DEFLATE application/xhtml+xml
        AddOutputFilterByType DEFLATE application/rss+xml
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE application/x-javascript
    </IfModule>
    
    ErrorLog \${APACHE_LOG_DIR}/jericho-error.log
    CustomLog \${APACHE_LOG_DIR}/jericho-access.log combined
</VirtualHost>
EOF

# Enable required Apache modules
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod deflate

# Disable default site and enable Jericho site
sudo a2dissite 000-default
sudo a2ensite jericho-security

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Test Apache configuration
sudo apache2ctl configtest

# Start Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# Configure firewall
sudo ufw allow 'Apache Full'

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "Installation complete!"
echo "Access your JERICHO Security System at: http://localhost"
echo "Or from network: http://\$(hostname -I | awk '{print \$1}')"
echo ""
echo "If you see MIME type errors:"
echo "1. Check that all files were copied: ls -la /var/www/html/"
echo "2. Restart Apache: sudo systemctl restart apache2"
echo "3. Check Apache error logs: sudo tail -f /var/log/apache2/jericho-error.log"
echo ""
echo "For authentication issues during git clone:"
echo "- Use personal access token instead of password"
echo "- Configure Git credentials: git config --global credential.helper store"
echo "- Or setup SSH keys for seamless GitHub access"`;
