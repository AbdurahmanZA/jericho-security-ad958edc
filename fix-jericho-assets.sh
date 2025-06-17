
#!/bin/bash

# Fix Apache MIME and SPA routing for Jericho Security deploys
# This specifically fixes the /assets/ exclusion issue

set -e

echo "== Fixing jericho-hls.conf to properly exclude /assets/ from SPA fallback =="

# Backup the current config
sudo cp /etc/apache2/sites-enabled/jericho-hls.conf /etc/apache2/sites-enabled/jericho-hls.conf.backup

# Create the corrected configuration
sudo tee /etc/apache2/sites-enabled/jericho-hls.conf > /dev/null <<'EOF'
<VirtualHost *:80>
    ServerAdmin admin@jericho.local
    ServerName jericho.local
    ServerAlias 192.168.0.138
    DocumentRoot /var/www/html

    # Enable CORS for HLS files
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"

    # Enable rewrite engine FIRST
    RewriteEngine On

    # Serve HLS and snapshots files directly BEFORE SPA fallback (CRITICAL ORDER)
    RewriteCond %{REQUEST_URI} ^/hls/
    RewriteRule ^.*$ - [L]

    RewriteCond %{REQUEST_URI} ^/snapshots/
    RewriteRule ^.*$ - [L]

    # CRITICAL: Exclude /assets/ from SPA fallback
    RewriteCond %{REQUEST_URI} ^/assets/
    RewriteRule .* - [L]

    # SPA fallback - send everything else to index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^.*$ /index.html [QSA,L]

    # Set proper MIME types for assets
    AddType application/javascript .js
    AddType text/css .css
    AddType application/json .json

    # HLS specific configuration
    <Directory "/var/www/html/hls">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted

        # Set proper MIME types for HLS
        AddType application/vnd.apple.mpegurl .m3u8
        AddType video/mp2t .ts

        # Cache control for HLS files
        ExpiresActive On
        ExpiresByType application/vnd.apple.mpegurl "access plus 1 seconds"
        ExpiresByType video/mp2t "access plus 10 seconds"

        # Enable range requests for HLS segments
        Header set Accept-Ranges bytes
    </Directory>

    <Directory "/var/www/html/snapshots">
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted

        # Cache control for snapshots
        ExpiresActive On
        ExpiresByType image/jpeg "access plus 1 hour"
        ExpiresByType image/png "access plus 1 hour"
    </Directory>

    # Assets directory with proper MIME types
    <Directory "/var/www/html/assets">
        Options -Indexes
        AllowOverride None
        Require all granted

        # Force correct MIME types for assets
        <FilesMatch "\.js$">
            ForceType application/javascript
        </FilesMatch>
        <FilesMatch "\.css$">
            ForceType text/css
        </FilesMatch>
        <FilesMatch "\.json$">
            ForceType application/json
        </FilesMatch>
    </Directory>

    # Proxy settings for backend API and WebSocket
    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket proxy for /api/ws
    ProxyPass /api/ws ws://localhost:3001/api/ws
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws

    # Regular HTTP proxy for all other API requests
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

echo "== Restarting Apache =="
sudo systemctl restart apache2

echo "== Testing JavaScript MIME type =="
curl -I http://192.168.0.138/assets/index-bUdscgck.js

echo
echo "== Done! The /assets/ directory should now serve proper MIME types =="
echo "Your app should load correctly now."
EOF

chmod +x fix-jericho-assets.sh
