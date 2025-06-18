
#!/bin/bash
# Test WebSocket connections for Jericho Security System

echo "🔍 Testing Jericho Security WebSocket Connections"
echo "================================================="

# Test 1: Check if backend is running
echo -e "\n1️⃣ Testing Backend Service Status:"
if systemctl is-active --quiet jericho-backend; then
    echo "✅ Backend service is running"
else
    echo "❌ Backend service is not running"
    echo "   Run: sudo systemctl start jericho-backend"
fi

# Test 2: Check if backend WebSocket endpoints respond
echo -e "\n2️⃣ Testing Backend WebSocket Endpoints (direct):"
echo "Testing /ws endpoint..."
response=$(curl -s -I http://localhost:3001/ws 2>/dev/null)
if echo "$response" | grep -q "404\|400"; then
    echo "✅ Backend /ws endpoint exists (404/400 expected for HTTP on WebSocket)"
else
    echo "❌ Backend /ws endpoint not found"
fi

echo "Testing /jsmpeg endpoint..."
response=$(curl -s -I http://localhost:3001/jsmpeg/1 2>/dev/null)
if echo "$response" | grep -q "404\|400"; then
    echo "✅ Backend /jsmpeg endpoint exists (404/400 expected for HTTP on WebSocket)"
else
    echo "❌ Backend /jsmpeg endpoint not found"
fi

# Test 3: Check Apache configuration
echo -e "\n3️⃣ Testing Apache Configuration:"
if apache2ctl configtest 2>/dev/null | grep -q "Syntax OK"; then
    echo "✅ Apache configuration is valid"
else
    echo "❌ Apache configuration has errors"
    echo "   Run: sudo apache2ctl configtest"
fi

# Test 4: Check if required Apache modules are enabled
echo -e "\n4️⃣ Checking Apache Modules:"
modules=("rewrite" "proxy" "proxy_http" "proxy_wstunnel" "headers")
for module in "${modules[@]}"; do
    if apache2ctl -M 2>/dev/null | grep -q "${module}_module"; then
        echo "✅ Module $module is enabled"
    else
        echo "❌ Module $module is not enabled"
        echo "   Run: sudo a2enmod $module"
    fi
done

# Test 5: Test Apache proxy endpoints
echo -e "\n5️⃣ Testing Apache Proxy Endpoints:"
echo "Testing /api endpoint through Apache..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/status 2>/dev/null)
if [ "$response" = "200" ]; then
    echo "✅ Apache /api proxy working"
elif [ "$response" = "502" ]; then
    echo "⚠️  Apache /api proxy configured but backend not responding"
else
    echo "❌ Apache /api proxy not working (HTTP $response)"
fi

# Test 6: Check firewall
echo -e "\n6️⃣ Checking Firewall Rules:"
if command -v ufw >/dev/null 2>&1; then
    if ufw status | grep -q "80/tcp.*ALLOW"; then
        echo "✅ Port 80 is open"
    else
        echo "⚠️  Port 80 may be blocked by firewall"
    fi
    if ufw status | grep -q "3001/tcp.*ALLOW"; then
        echo "✅ Port 3001 is open"
    else
        echo "⚠️  Port 3001 may be blocked by firewall"
    fi
else
    echo "ℹ️  UFW not installed, skipping firewall check"
fi

echo -e "\n🔧 Quick Fixes:"
echo "   Clear browser data: Open DevTools Console and paste contents of clear-browser-data.js"
echo "   Restart services: sudo systemctl restart jericho-backend && sudo systemctl reload apache2"
echo "   Check logs: sudo journalctl -u jericho-backend -f"
echo "   Apache errors: sudo tail -f /var/log/apache2/jericho_error.log"

echo -e "\n✅ Diagnostic complete!"
