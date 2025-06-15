
#!/bin/bash

# JERICHO Security System - Update Script
# Runs safe updates for dependencies and HTTPS support.
set -e

echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Updating FFmpeg to latest stable..."
sudo apt install -y ffmpeg

echo "Updating Certbot and configuring HTTPS support..."
sudo apt install -y certbot python3-certbot-apache

DOMAIN="jericho.local"   # Change this to your public domain if set

if [ -n "$DOMAIN" ]; then
  echo "Attempting to set up HTTPS for $DOMAIN using Let's Encrypt (certbot)..."
  sudo certbot --apache --non-interactive --agree-tos -m youremail@example.com -d $DOMAIN || true

  # Fallback if certbot fails or for local access:
  if [ ! -f /etc/ssl/certs/jericho-selfsigned.crt ]; then
    echo "Generating self-signed certificate for Apache..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/ssl/private/jericho-selfsigned.key \
      -out /etc/ssl/certs/jericho-selfsigned.crt \
      -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=$DOMAIN"
  fi
  sudo systemctl restart apache2
fi

echo "Reloading backend and Apache services..."
sudo systemctl daemon-reload
sudo systemctl restart jericho-backend
sudo systemctl restart apache2

echo "========================================"
echo "JERICHO Security System updated. FFmpeg and HTTPS are now up to date."
echo "Visit https://$DOMAIN (or https://localhost with advanced browser settings for self-signed certs)."
echo "========================================"
