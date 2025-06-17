
#!/bin/bash
# Configure Apache to proxy WebSocket connections to Jericho Security backend

set -e

echo "== Enabling Apache proxy modules =="
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel

echo "== Updating Apache configuration for WebSocket proxying =="

APACHE_CONF="/etc/apache2/sites-available/jericho-security.conf"

# Check if proxy configuration already exists
if grep -q "ProxyPass /api/" "$APACHE_CONF"; then
    echo "Proxy configuration already exists in $APACHE_CONF"
else
    echo "Adding proxy configuration to $APACHE_CONF"
    
    # Add proxy configuration before the closing </VirtualHost> tag
    sudo sed -i '/<\/VirtualHost>/i\
\
    # Proxy API requests to backend server\
    ProxyPreserveHost On\
    ProxyRequests Off\
    \
    # WebSocket proxy for /api/ws\
    ProxyPass /api/ws ws://localhost:3001/api/ws\
    ProxyPassReverse /api/ws ws://localhost:3001/api/ws\
    \
    # Regular HTTP proxy for all other API requests\
    ProxyPass /api/ http://localhost:3001/api/\
    ProxyPassReverse /api/ http://localhost:3001/api/\
' "$APACHE_CONF"
fi

echo "== Testing Apache configuration =="
sudo apache2ctl configtest

if [ $? -eq 0 ]; then
    echo "== Restarting Apache =="
    sudo systemctl restart apache2
    echo "Apache configuration updated successfully!"
    echo ""
    echo "Backend WebSocket should now be accessible at:"
    echo "  wss://192.168.0.138/api/ws"
    echo ""
    echo "Test the connection by checking the frontend logs."
else
    echo "Apache configuration test failed. Please check the configuration manually."
    exit 1
fi
