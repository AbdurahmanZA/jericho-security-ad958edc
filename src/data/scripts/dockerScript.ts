
export const dockerScript = `# JERICHO Security System - Docker Installation
# Pull and run the official Docker image

docker stop jericho-security 2>/dev/null || true
docker rm jericho-security 2>/dev/null || true

docker run -d \\
  --name jericho-security \\
  -p 80:80 \\
  -p 3001:3001 \\
  -v jericho-data:/app/data \\
  --restart unless-stopped \\
  abdurahmanza/jericho-security-system:latest

echo "JERICHO Security System is running at http://localhost"`;
