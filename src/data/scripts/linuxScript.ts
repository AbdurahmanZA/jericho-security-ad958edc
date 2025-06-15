
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

# Verify build completed successfully
if [ ! -d "dist" ]; then
    echo "ERROR: Build failed - dist directory not found"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "ERROR: Build failed - index.html not found in dist"
    exit 1
fi

echo "Build verification successful. Files in dist:"
ls -la dist/

# Stop Apache
sudo systemctl stop apache2

# Backup existing Apache config
sudo cp /etc/apache2/sites-available/000-default.conf /etc/apache2/sites-available/000-default.conf.backup || true

# Clean Apache document root completely
sudo rm -rf /var/www/html/*
sudo rm -rf /var/www/html/.*  2>/dev/null || true

# Copy built files with verbose output
echo "Deploying files to /var/www/html..."
sudo cp -rv dist/* /var/www/html/

# Verify files were copied
echo "Verifying deployment - files in /var/www/html:"
sudo ls -la /var/www/html/

# Create comprehensive Apache configuration for SPA
sudo tee /etc/apache2/sites-available/jericho-security.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    DocumentRoot /var/www/html
    ServerName localhost
    
    # Enable rewrite module for SPA routing
    RewriteEngine On
    
    # Handle SPA routing - redirect all non-file requests to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/favicon.ico$
    RewriteRule ^.*$ /index.html [QSA,L]
    
    # Serve static assets with proper MIME types
    <LocationMatch "\\.(css|js|map|json|ico|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$">
        # Force correct MIME types
        <IfModule mod_mime.c>
            AddType text/css .css
            AddType application/javascript .js
            AddType application/json .json .map
            AddType image/svg+xml .svg
            AddType image/x-icon .ico
            AddType font/woff .woff
            AddType font/woff2 .woff2
        </IfModule>
        
        # Cache static assets
        Header always set Cache-Control "public, max-age=31536000"
        
        # Prevent rewrite rules from applying to static assets
        RewriteEngine Off
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
        AddOutputFilterByType DEFLATE application/json
    </IfModule>
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/jericho-error.log
    CustomLog \${APACHE_LOG_DIR}/jericho-access.log combined
    LogLevel info
</VirtualHost>
EOF

# Enable required Apache modules
echo "Enabling Apache modules..."
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod deflate
sudo a2enmod mime

# Disable default site and enable Jericho site
sudo a2dissite 000-default
sudo a2ensite jericho-security

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Test Apache configuration
echo "Testing Apache configuration..."
sudo apache2ctl configtest

if [ $? -ne 0 ]; then
    echo "Apache configuration test failed. Check the configuration."
    exit 1
fi

# Start Apache
sudo systemctl start apache2
sudo systemctl enable apache2

# Configure firewall
sudo ufw allow 'Apache Full'

# Final verification
echo "Final verification..."
sleep 2

# Check if Apache is running
if sudo systemctl is-active --quiet apache2; then
    echo "Apache is running successfully"
else
    echo "WARNING: Apache failed to start"
    sudo systemctl status apache2
fi

# Check if files are accessible
echo "Checking file accessibility..."
if curl -f -s http://localhost/index.html > /dev/null; then
    echo "✓ index.html is accessible"
else
    echo "✗ index.html is NOT accessible"
fi

# List actual files in web directory
echo "Files actually deployed:"
sudo find /var/www/html -type f -name "*.css" -o -name "*.js" -o -name "*.html" | head -10

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo "Access your JERICHO Security System at:"
echo "- Local: http://localhost"
echo "- Network: http://\$(hostname -I | awk '{print \$1}')"
echo ""
echo "TROUBLESHOOTING:"
echo "If you see MIME type errors:"
echo "1. Check Apache error log: sudo tail -f /var/log/apache2/jericho-error.log"
echo "2. Check Apache access log: sudo tail -f /var/log/apache2/jericho-access.log"
echo "3. Verify files exist: ls -la /var/www/html/"
echo "4. Test file accessibility: curl -I http://localhost/assets/"
echo "5. Restart Apache: sudo systemctl restart apache2"
echo "6. Check Apache modules: sudo apache2ctl -M | grep -E 'rewrite|mime|headers'"
echo ""
echo "For authentication issues during git clone:"
echo "- Use personal access token instead of password"
echo "- Configure Git credentials: git config --global credential.helper store"
echo "- Or setup SSH keys for seamless GitHub access"`;
