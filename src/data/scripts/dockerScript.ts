
export const dockerScript = `# JERICHO Security System - Docker Installation
# Updated with latest configuration and WebSocket fixes

echo "========================================"
echo "JERICHO Security System - Docker Setup"
echo "========================================"

# Stop and remove any existing containers
echo "🛑 Stopping existing containers..."
docker stop jericho-security 2>/dev/null || true
docker stop jericho-backend 2>/dev/null || true
docker rm jericho-security 2>/dev/null || true
docker rm jericho-backend 2>/dev/null || true

# Create network for internal communication
echo "🌐 Creating Docker network..."
docker network create jericho-network 2>/dev/null || true

# Create volumes for persistent data
echo "📁 Creating Docker volumes..."
docker volume create jericho-data
docker volume create jericho-hls
docker volume create jericho-snapshots

# Pull latest images
echo "⬇️ Pulling latest Docker images..."
docker pull node:18-alpine
docker pull nginx:alpine

# Create Dockerfile for backend
echo "🏗️ Building backend container..."
cat > Dockerfile.backend << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

# Copy package files
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Create data directories
RUN mkdir -p /app/data /app/hls

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3001/api/health/database || exit 1

CMD ["node", "server.js"]
EOF

# Create nginx configuration
echo "⚙️ Creating nginx configuration..."
mkdir -p nginx-config
cat > nginx-config/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # WebSocket upgrade headers
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # CORS headers for camera streams
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        # Handle assets with correct MIME types
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

        # HLS streaming
        location /hls/ {
            add_header Cache-Control "no-cache, must-revalidate";
            add_header Access-Control-Allow-Origin "*";
            
            location ~* \\.m3u8$ {
                add_header Content-Type "application/vnd.apple.mpegurl";
                expires 1s;
            }
            location ~* \\.ts$ {
                add_header Content-Type "video/mp2t";
                expires 10s;
            }
        }

        # Snapshots
        location /snapshots/ {
            expires 1h;
            add_header Cache-Control "public";
        }

        # WebSocket proxy for /api/ws (using http:// for internal Docker communication)
        location /api/ws {
            proxy_pass http://jericho-backend:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API proxy
        location /api/ {
            proxy_pass http://jericho-backend:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Build backend image
echo "🏗️ Building backend image..."
docker build -f Dockerfile.backend -t jericho-backend:latest .

# Run backend container
echo "🚀 Starting backend container..."
docker run -d \\
  --name jericho-backend \\
  --network jericho-network \\
  -p 3001:3001 \\
  -v jericho-data:/app/data \\
  -v jericho-hls:/app/hls \\
  -v jericho-snapshots:/app/snapshots \\
  --restart unless-stopped \\
  --health-cmd="curl -f http://localhost:3001/api/status || exit 1" \\
  --health-interval=30s \\
  --health-timeout=10s \\
  --health-retries=3 \\
  jericho-backend:latest

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Download and extract frontend (if not already available)
if [ ! -d "dist" ]; then
    echo "⬇️ Downloading frontend build..."
    # You would need to build the frontend or download it
    # For now, create a placeholder
    mkdir -p dist
    echo "<h1>JERICHO Security System</h1><p>Frontend build needed</p>" > dist/index.html
fi

# Run frontend container with nginx
echo "🚀 Starting frontend container..."
docker run -d \\
  --name jericho-security \\
  --network jericho-network \\
  -p 80:80 \\
  -v $(pwd)/dist:/usr/share/nginx/html:ro \\
  -v $(pwd)/nginx-config/nginx.conf:/etc/nginx/nginx.conf:ro \\
  -v jericho-hls:/usr/share/nginx/html/hls \\
  -v jericho-snapshots:/usr/share/nginx/html/snapshots \\
  --restart unless-stopped \\
  nginx:alpine

# Test services
echo "🧪 Testing services..."
sleep 5

if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "⚠️ Backend may need more time to start"
    echo "📋 Backend logs:"
    docker logs jericho-backend --tail 10
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "⚠️ Frontend may need troubleshooting"
    echo "📋 Frontend logs:"
    docker logs jericho-security --tail 10
fi

# Cleanup build files
echo "🧹 Cleaning up..."
rm -f Dockerfile.backend
rm -rf nginx-config

echo "========================================"
echo "✅ JERICHO Security System Docker Setup Complete!"
echo "========================================"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:3001/api/status"
echo "📊 Container status: docker ps"
echo ""
echo "🔧 Management Commands:"
echo "• View all containers: docker ps -a"
echo "• Backend logs: docker logs -f jericho-backend"
echo "• Frontend logs: docker logs -f jericho-security"
echo "• Stop all: docker stop jericho-backend jericho-security"
echo "• Restart backend: docker restart jericho-backend"
echo "• Restart frontend: docker restart jericho-security"
echo ""
echo "📁 Persistent Data:"
echo "• Application data: jericho-data volume"
echo "• HLS streams: jericho-hls volume"
echo "• Snapshots: jericho-snapshots volume"
echo ""
echo "🚨 Important Notes:"
echo "• Frontend build may need to be properly deployed"
echo "• WebSocket connections use internal Docker network"
echo "• Add your camera RTSP URLs through the web interface"
echo "• Monitor container health with: docker ps"
echo "========================================"
`;
