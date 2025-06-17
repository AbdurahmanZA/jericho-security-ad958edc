
export const dockerComposeScript = `# JERICHO Security System - Docker Compose Configuration
# Updated with latest fixes and production-ready setup

version: '3.8'

services:
  # Backend API Server
  jericho-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: jericho-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    ports:
      - "3001:3001"
    volumes:
      - jericho_data:/app/data
      - jericho_hls:/app/hls
      - jericho_snapshots:/app/snapshots
      - /dev/shm:/dev/shm  # Shared memory for FFmpeg
    networks:
      - jericho_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - jericho-db
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend Web Server
  jericho-frontend:
    image: nginx:alpine
    container_name: jericho-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - jericho_hls:/usr/share/nginx/html/hls
      - jericho_snapshots:/usr/share/nginx/html/snapshots
    networks:
      - jericho_network
    depends_on:
      - jericho-backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "5m"
        max-file: "3"

  # SQLite Database (using volume mount)
  jericho-db:
    image: alpine:latest
    container_name: jericho-db
    restart: unless-stopped
    volumes:
      - jericho_data:/data
    networks:
      - jericho_network
    command: tail -f /dev/null  # Keep container running
    healthcheck:
      test: ["CMD", "test", "-f", "/data/jericho.db"]
      interval: 30s
      timeout: 5s
      retries: 3

  # FFmpeg Video Processing Service
  jericho-ffmpeg:
    image: jrottenberg/ffmpeg:4.4-alpine
    container_name: jericho-ffmpeg
    restart: unless-stopped
    volumes:
      - jericho_hls:/output
      - /dev/shm:/dev/shm
    networks:
      - jericho_network
    command: tail -f /dev/null  # Keep container running for on-demand processing
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Log aggregator (optional)
  jericho-logs:
    image: busybox:latest
    container_name: jericho-logs
    restart: unless-stopped
    volumes:
      - jericho_logs:/logs
    networks:
      - jericho_network
    command: tail -f /dev/null

networks:
  jericho_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  jericho_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data
  jericho_hls:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./hls
  jericho_snapshots:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./snapshots
  jericho_logs:
    driver: local

---
# Additional files needed for this setup:

# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

# Install FFmpeg and system dependencies
RUN apk add --no-cache \\
    ffmpeg \\
    curl \\
    sqlite \\
    build-base \\
    python3 \\
    make \\
    g++

# Copy package files
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Create directories
RUN mkdir -p /app/data /app/hls /app/snapshots

# Set permissions
RUN chown -R node:node /app
USER node

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3001/api/status || exit 1

CMD ["node", "server.js"]

---
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # WebSocket support
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=5r/s;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Robots-Tag "noindex, nofollow" always;

        # CORS for camera streams
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        # Assets with proper MIME types and caching
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            
            location ~* \\.js$ {
                add_header Content-Type "application/javascript";
            }
            location ~* \\.css$ {
                add_header Content-Type "text/css";
            }
            location ~* \\.json$ {
                add_header Content-Type "application/json";
            }
        }

        # HLS streaming with optimized caching
        location /hls/ {
            add_header Cache-Control "no-cache, must-revalidate";
            add_header Access-Control-Allow-Origin "*";
            
            location ~* \\.m3u8$ {
                add_header Content-Type "application/vnd.apple.mpegurl";
                expires 1s;
                add_header Cache-Control "no-cache";
            }
            location ~* \\.ts$ {
                add_header Content-Type "video/mp2t";
                expires 10s;
                add_header Accept-Ranges bytes;
            }
        }

        # Snapshots
        location /snapshots/ {
            expires 1h;
            add_header Cache-Control "public";
        }

        # WebSocket proxy with rate limiting
        location /api/ws {
            limit_req zone=websocket burst=10 nodelay;
            
            proxy_pass http://jericho-backend:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # API proxy with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://jericho-backend:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Deny access to sensitive files
        location ~ /\\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}

---
# docker-compose.prod.yml (Production variant with SSL)
version: '3.8'

services:
  jericho-backend:
    # ... same as above ...
    
  jericho-frontend:
    image: nginx:alpine
    container_name: jericho-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - jericho_hls:/usr/share/nginx/html/hls
      - jericho_snapshots:/usr/share/nginx/html/snapshots
    networks:
      - jericho_network
    depends_on:
      - jericho-backend

  # SSL certificate manager
  certbot:
    image: certbot/certbot
    container_name: jericho-certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./dist:/usr/share/nginx/html
    command: certonly --webroot --webroot-path=/usr/share/nginx/html --email admin@yourdomain.com --agree-tos --no-eff-email -d yourdomain.com
    
networks:
  jericho_network:
    driver: bridge

volumes:
  jericho_data:
  jericho_hls:
  jericho_snapshots:
  jericho_logs:

---
# Installation Instructions:

# 1. Create project directory:
mkdir jericho-security && cd jericho-security

# 2. Create required directories:
mkdir -p data hls snapshots ssl

# 3. Clone repository and build:
git clone https://github.com/AbdurahmanZA/jericho-security-ad958edc.git .
npm install
npm run build

# 4. Start services:
docker-compose up -d

# 5. Check status:
docker-compose ps
docker-compose logs -f

# 6. Access application:
# Frontend: http://localhost
# Backend API: http://localhost:3001/api/status

# 7. For production with SSL:
# docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 8. Management commands:
# Stop: docker-compose down
# Update: docker-compose pull && docker-compose up -d
# Logs: docker-compose logs -f [service-name]
# Scale: docker-compose up -d --scale jericho-backend=2
`;
