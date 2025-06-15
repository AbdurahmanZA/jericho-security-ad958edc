
#!/bin/bash
# JERICHO Security System - Asterisk Installation Script for Ubuntu 24.04

set -e

echo "Installing Asterisk with GSM and G.729 codec for JERICHO Security System..."

# Update system
sudo apt update

# Install Asterisk and dependencies
sudo apt install -y asterisk asterisk-modules asterisk-config asterisk-dev build-essential

# Install G.729 codec (open source version)
echo "Installing G.729 codec..."
cd /tmp
wget http://asterisk.hosting.lv/src/asterisk-g729-1.5.0-x86_64.tar.bz2 || echo "G.729 download failed - GSM codec will be used as default"
if [ -f asterisk-g729-1.5.0-x86_64.tar.bz2 ]; then
  tar -xjf asterisk-g729-1.5.0-x86_64.tar.bz2
  sudo cp asterisk-g729-1.5.0-x86_64/codec_g729.so /usr/lib/asterisk/modules/
  sudo chown asterisk:asterisk /usr/lib/asterisk/modules/codec_g729.so
  sudo chmod 755 /usr/lib/asterisk/modules/codec_g729.so
  echo "G.729 codec installed successfully"
else
  echo "Using built-in GSM codec (recommended for emergency communications)"
fi

# Create backup of original configs
sudo cp /etc/asterisk/sip.conf /etc/asterisk/sip.conf.backup 2>/dev/null || true
sudo cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup 2>/dev/null || true

# Set proper permissions
sudo chown -R asterisk:asterisk /etc/asterisk/
sudo chmod -R 644 /etc/asterisk/*.conf
sudo chmod 755 /etc/asterisk/

# Enable and start Asterisk service
sudo systemctl enable asterisk
sudo systemctl stop asterisk || true

# Create systemd override for proper startup
sudo mkdir -p /etc/systemd/system/asterisk.service.d/
sudo tee /etc/systemd/system/asterisk.service.d/override.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/asterisk -f -C /etc/asterisk/asterisk.conf
User=asterisk
Group=asterisk
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Configure firewall for SIP
sudo ufw allow 5060/udp comment "SIP"
sudo ufw allow 5060/tcp comment "SIP"
sudo ufw allow 10000:20000/udp comment "RTP"

# Add www-data to asterisk group for backend management
sudo usermod -a -G asterisk www-data

# Create asterisk CLI wrapper for backend
sudo tee /usr/local/bin/asterisk-cli > /dev/null << 'EOF'
#!/bin/bash
sudo -u asterisk asterisk -rx "$*"
EOF
sudo chmod +x /usr/local/bin/asterisk-cli

# Configure sudo permissions for backend management
sudo tee /etc/sudoers.d/jericho-asterisk > /dev/null << 'EOF'
# Allow www-data to manage Asterisk for JERICHO
www-data ALL=(ALL) NOPASSWD: /bin/systemctl start asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl stop asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl restart asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl status asterisk
www-data ALL=(ALL) NOPASSWD: /bin/systemctl is-active asterisk
www-data ALL=(ALL) NOPASSWD: /usr/sbin/asterisk -rx *
www-data ALL=(ALL) NOPASSWD: /usr/local/bin/asterisk-cli *
EOF

echo "=================================="
echo "Asterisk Installation Complete!"
echo "=================================="
echo "🟢 Asterisk installed with GSM (default) and G.729 codec support"
echo "🟢 Firewall configured for SIP (5060) and RTP (10000-20000)"
echo "🟢 Backend integration permissions configured"
echo ""
echo "📋 Next steps:"
echo "1. Restart your JERICHO backend server"
echo "2. Go to Settings > SIP/VoIP in the web interface"
echo "3. Configure your SIP settings and extensions (GSM codec recommended)"
echo "4. Start Asterisk from the web interface"
echo ""
echo "🔧 Manual commands:"
echo "Check status: sudo systemctl status asterisk"
echo "Start Asterisk: sudo systemctl start asterisk"
echo "Stop Asterisk: sudo systemctl stop asterisk"
echo "Asterisk CLI: sudo asterisk -r"
echo "=================================="
echo ""
echo "🎙️ CODEC INFO:"
echo "• GSM: 13kbps, excellent quality, built-in support"
echo "• G.729: 8kbps, very efficient, optional module"
echo "• Recommended: Use GSM for reliability and quality"
echo "=================================="
