
export const dockerComposeScript = `version: '3.8'

services:
  jericho-security:
    image: abdurahmanza/jericho-security-system:latest
    container_name: jericho-security
    ports:
      - "80:80"
      - "3001:3001"
    volumes:
      - jericho-data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  jericho-data:`;
