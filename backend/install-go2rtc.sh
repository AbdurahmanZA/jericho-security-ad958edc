
#!/bin/bash
# JERICHO Security System - go2rtc WebRTC Media Server Installation

set -e

echo "Installing go2rtc WebRTC Media Server for JERICHO..."

# Create go2rtc directory
sudo mkdir -p /opt/go2rtc
cd /opt/go2rtc

# Download latest go2rtc
echo "Downloading go2rtc..."
wget -O go2rtc https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_amd64
sudo chmod +x go2rtc

# Create go2rtc configuration
sudo tee /opt/go2rtc/go2rtc.yaml > /dev/null << 'EOF'
api:
  listen: ":1984"

rtsp:
  listen: ":8554"

webrtc:
  listen: ":8555"
  ice_servers:
    - urls: ["stun:stun.l.google.com:19302"]

streams:
  camera_1: rtsp://admin:password@192.168.1.100:554/stream1
  camera_2: rtsp://admin:password@192.168.1.101:554/stream1
  camera_3: rtsp://admin:password@192.168.1.102:554/stream1
  camera_4: rtsp://admin:password@192.168.1.103:554/stream1

log:
  level: info
EOF

# Create systemd service
sudo tee /etc/systemd/system/go2rtc.service > /dev/null << 'EOF'
[Unit]
Description=go2rtc WebRTC Media Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/go2rtc
ExecStart=/opt/go2rtc/go2rtc -config /opt/go2rtc/go2rtc.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Set proper ownership
sudo chown -R www-data:www-data /opt/go2rtc

# Configure firewall
sudo ufw allow 1984/tcp comment "go2rtc API"
sudo ufw allow 8554/tcp comment "go2rtc RTSP"
sudo ufw allow 8555/tcp comment "go2rtc WebRTC"

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable go2rtc
sudo systemctl start go2rtc

echo "=================================="
echo "go2rtc WebRTC Media Server Installed!"
echo "=================================="
echo "🟢 go2rtc running on port 1984 (API), 8554 (RTSP), 8555 (WebRTC)"
echo "🟢 Configuration: /opt/go2rtc/go2rtc.yaml"
echo "🟢 Service status: sudo systemctl status go2rtc"
echo ""
echo "📋 Next steps:"
echo "1. Edit /opt/go2rtc/go2rtc.yaml to add your camera RTSP URLs"
echo "2. Restart go2rtc: sudo systemctl restart go2rtc"
echo "3. Access go2rtc web UI: http://your-ip:1984"
echo "4. Test WebRTC streams in JERICHO interface"
echo "=================================="
EOF

# Make script executable
sudo chmod +x /opt/go2rtc/install-go2rtc.sh
