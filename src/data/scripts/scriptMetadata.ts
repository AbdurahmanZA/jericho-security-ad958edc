
export const scriptMetadata = {
  linux: {
    name: 'Ubuntu 24.04 LTS - Simplified',
    description: 'Streamlined installation script for Ubuntu 24.04 with minimal configuration required',
    icon: '🐧',
    fileExtension: '.sh',
    requirements: [
      'Ubuntu 24.04 LTS (recommended) or Ubuntu 22.04+',
      'Sudo access',
      'Internet connection',
      'Minimum 2GB RAM (4GB recommended)',
      'At least 5GB free disk space'
    ],
    features: [
      'Self-contained installation (no external scripts needed)',
      'Frontend web application with live camera feeds',
      'Backend API server with WebSocket support',
      'Apache2 web server with proxy configuration',
      'FFmpeg for video processing and HLS streaming',
      'Asterisk PBX for VoIP (managed via web interface)',
      'Automatic service management',
      'Minimal post-install configuration required'
    ]
  }
};
