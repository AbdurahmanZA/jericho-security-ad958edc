
export const scriptMetadata = {
  linux: {
    title: "Ubuntu/Debian Installation",
    description: "Complete installation script that clones from GitHub, builds the application, and deploys to Apache.",
    prerequisites: "Ubuntu 18.04+ with sudo privileges, internet connection",
    usage: "Save as install.sh, make executable: chmod +x install.sh, then run: ./install.sh",
    features: [
      "Automatic dependency installation (Node.js, npm, Apache)",
      "Git clone from repository with build process",
      "Automatic Apache configuration and deployment",
      "Firewall configuration for web ports",
      "Clean installation with error handling"
    ]
  },
  windows: {
    title: "Windows Installation", 
    description: "Windows batch script that clones from GitHub, builds, and deploys to IIS.",
    prerequisites: "Git, Node.js, npm, IIS, Administrator privileges",
    usage: "Save as install.bat and run as Administrator"
  },
  macos: {
    title: "macOS Installation",
    description: "macOS installation script using Git clone, build process, and nginx deployment.",
    prerequisites: "Xcode Command Line Tools, internet connection",
    usage: "Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh"
  },
  docker: {
    title: "Docker Installation",
    description: "Simple Docker run command for immediate deployment.",
    prerequisites: "Docker Engine",
    ports: "80 (Web UI), 3001 (WebSocket)"
  },
  compose: {
    title: "Docker Compose",
    description: "Minimal docker-compose.yml for production deployment.",
    prerequisites: "Docker, Docker Compose", 
    usage: "Save as docker-compose.yml, then run docker-compose up -d"
  }
};
