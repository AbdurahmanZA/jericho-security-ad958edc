
#!/bin/bash
# Fix Apache MIME and SPA routing for Jericho Security deploys

set -e

echo "== Updating .htaccess =="
sudo tee /var/www/html/.htaccess > /dev/null <<'EOF'
# Enable rewrite engine
RewriteEngine On

# Do not rewrite requests for the assets directory (stop rewrite early)
RewriteCond %{REQUEST_URI} ^/assets/ [NC]
RewriteRule .* - [L]

# Serve CSS/JS with the correct content types
AddType text/css .css
AddType application/javascript .js
AddType application/json .json

# SPA fallback - send everything else to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^.*$ /index.html [QSA,L]

# Force correct MIME types for assets
<FilesMatch "\.css$">
    ForceType text/css
</FilesMatch>
<FilesMatch "\.js$">
    ForceType application/javascript
</FilesMatch>
<FilesMatch "\.json$">
    ForceType application/json
</FilesMatch>

# Set proper headers for assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000"
    Header unset ETag
</FilesMatch>
EOF

echo -e "\n== Ensuring AllowOverride is enabled for /var/www/html =="

APACHE_CONF="/etc/apache2/sites-available/000-default.conf"
DIR_BLOCK=$(awk '/<Directory \/var\/www\/html>/{print NR}' "$APACHE_CONF")

if [ -z "$DIR_BLOCK" ]; then
  echo "No <Directory /var/www/html> block found in $APACHE_CONF -- adding one."
  sudo tee -a "$APACHE_CONF" > /dev/null <<'EODIR'

<Directory /var/www/html>
    AllowOverride All
    Require all granted
</Directory>
EODIR
else
  # Replace any AllowOverride directives within this Directory block
  sudo sed -i '/<Directory \/var\/www\/html>/,/<\/Directory>/{s/AllowOverride .*/AllowOverride All/}' "$APACHE_CONF"
  echo "Set AllowOverride All in existing <Directory /var/www/html> block."
fi

echo "== Enabling required Apache modules (rewrite, headers) =="
sudo a2enmod rewrite
sudo a2enmod headers

echo "== Restarting Apache =="
sudo systemctl restart apache2

echo "== Done! Check your CSS/JS assets with: =="
echo "curl -I http://localhost/assets/yourfile.css"
