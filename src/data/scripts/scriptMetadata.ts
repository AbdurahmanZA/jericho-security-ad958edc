
export const scriptMetadata = {
  linux: {
    title: "Ubuntu 24.04 Complete Installation",
    description: "Complete installation script with backend server, RTSP processing, WebSocket support, and camera management for Ubuntu 24.04 on ESXi.",
    prerequisites: "Ubuntu 24.04 LTS with sudo privileges, internet connection, 4GB+ RAM, Git access to repository",
    usage: "Save as install.sh, make executable: chmod +x install.sh, then run: ./install.sh",
    features: [
      "Complete backend server with Node.js, Express, and WebSocket support",
      "FFmpeg RTSP to HLS stream conversion for web browsers",
      "SQLite database for camera configuration and motion events", 
      "Real-time WebSocket communication for live updates",
      "Camera snapshot capture and motion detection support",
      "Apache reverse proxy configuration for API and streams",
      "Systemd service for automatic backend startup",
      "Firewall configuration and security hardening",
      "Complete camera management API endpoints",
      "HLS streaming support for web-based video playback"
    ]
  },
  windows: {
    title: "Windows Installation", 
    description: "Windows batch script that clones from your GitHub repository, builds, and deploys to IIS.",
    prerequisites: "Git, Node.js, npm, IIS, Administrator privileges, Repository access",
    usage: "Save as install.bat and run as Administrator"
  },
  macos: {
    title: "macOS Installation",
    description: "macOS installation script using Git clone from your repository, build process, and nginx deployment.",
    prerequisites: "Xcode Command Line Tools, internet connection, Repository access",
    usage: "Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh"
  },
  docker: {
    title: "Docker Installation",
    description: "Simple Docker run command for immediate deployment.",
    prerequisites: "Docker Engine",
    ports: "80 (Web UI), 3001 (WebSocket/API)"
  },
  compose: {
    title: "Docker Compose",
    description: "Minimal docker-compose.yml for production deployment.",
    prerequisites: "Docker, Docker Compose", 
    usage: "Save as docker-compose.yml, then run docker-compose up -d"
  }
};
