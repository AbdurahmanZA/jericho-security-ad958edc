
#!/bin/bash

# Unify Apache config for Jericho Security deployment

set -e

echo "== Disabling unused Apache site configs =="
if [ -e /etc/apache2/sites-enabled/000-default.conf ]; then
    sudo a2dissite 000-default.conf || true
fi
if [ -e /etc/apache2/sites-enabled/jericho.conf ]; then
    sudo a2dissite jericho.conf || true
fi

echo "== Enabling jericho-security.conf =="
sudo a2ensite jericho-security.conf

CONF_PATH="/etc/apache2/sites-available/jericho-security.conf"

echo "== Ensuring AllowOverride All in $CONF_PATH =="

if grep -q '<Directory "/var/www/html">' "$CONF_PATH"; then
    # Replace the AllowOverride line if it exists within the relevant Directory block
    sudo sed -i '/<Directory "\/var\/www\/html">/,/<\/Directory>/{s/AllowOverride .*/AllowOverride All/; s/Require .*/Require all granted/}' "$CONF_PATH"
    echo "Patched AllowOverride and Require lines in $CONF_PATH"
else
    # Add the Directory block if not present
    sudo tee -a "$CONF_PATH" > /dev/null <<EOF

<Directory "/var/www/html">
    AllowOverride All
    Require all granted
</Directory>
EOF
    echo "Appended <Directory /var/www/html> block to $CONF_PATH"
fi

echo "== Reloading Apache config =="
sudo systemctl reload apache2

echo
echo "All done! Only 'jericho-security.conf' is now enabled."
echo "Your .htaccess should now control asset MIME types correctly."
echo
echo "To test, run:    curl -I http://localhost/assets/index-YOURFILE.css"
