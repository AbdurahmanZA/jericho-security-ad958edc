
export const scriptMetadata = {
  linux: {
    title: "Ubuntu/Debian Installation",
    description: "Simplified installation using npm's GitHub integration. Installs directly from the repository.",
    prerequisites: "Ubuntu 18.04+ with sudo privileges",
    usage: "Save as install.sh, make executable: chmod +x install.sh, then run: ./install.sh",
    features: [
      "Uses npm's built-in GitHub installation",
      "Automatic dependency resolution",
      "Simple Apache configuration",
      "Minimal setup with maximum reliability",
      "Easy to maintain and debug"
    ]
  },
  windows: {
    title: "Windows Installation", 
    description: "Simple batch script using npm GitHub installation with IIS.",
    prerequisites: "Git, Node.js, npm, IIS",
    usage: "Save as install.bat and run as Administrator"
  },
  macos: {
    title: "macOS Installation",
    description: "Simplified installation using npm and Homebrew with nginx.",
    prerequisites: "Xcode Command Line Tools",
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
