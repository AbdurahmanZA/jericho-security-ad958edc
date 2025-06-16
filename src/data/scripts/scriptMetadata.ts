
export const scriptMetadata = {
  linux: {
    name: 'Ubuntu 24.04 LTS',
    description: 'Complete installation script for Ubuntu 24.04 with Apache, FFmpeg, and Asterisk VoIP',
    icon: '🐧',
    fileExtension: '.sh',
    requirements: [
      'Ubuntu 24.04 LTS or compatible',
      'Sudo access',
      'Internet connection',
      'Minimum 4GB RAM',
      'At least 10GB free disk space'
    ],
    features: [
      'Frontend web application',
      'Backend API server with WebSocket',
      'Apache2 with SSL support',
      'FFmpeg for video processing',
      'Asterisk PBX with GSM/G.729 codecs',
      'HLS streaming support',
      'Emergency calling system'
    ]
  },
  esxiUbuntu: {
    name: 'ESXi Ubuntu 24.04',
    description: 'Optimized installation for VMware ESXi with Ubuntu 24.04, including production-ready SIP/VoIP integration',
    icon: '🏢',
    fileExtension: '.sh',
    requirements: [
      'VMware ESXi 6.5+ or vSphere',
      'Ubuntu 24.04 LTS VM (4GB+ RAM recommended)',
      'Static IP address configured',
      'Port forwarding for web access',
      'Network access to camera systems'
    ],
    features: [
      'Production-ready SIP/VoIP with real backend integration',
      'Real-time Asterisk management via web interface',
      'Database-backed extension management',
      'Live call logging and monitoring',
      'Emergency calling system with South African dialing',
      'SSL certificate generation',
      'Firewall configuration for enterprise networks',
      'Comprehensive logging and monitoring'
    ]
  },
  windows: {
    name: 'Windows 10/11',
    description: 'Installation guide for Windows systems using WSL2 and Docker',
    icon: '🪟',
    fileExtension: '.ps1',
    requirements: [
      'Windows 10/11 with WSL2',
      'Docker Desktop',
      'PowerShell (Admin)',
      'At least 8GB RAM',
      'Windows Subsystem for Linux enabled'
    ],
    features: [
      'WSL2-based installation',
      'Docker containerization',
      'Windows-compatible paths',
      'PowerShell automation',
      'Cross-platform compatibility'
    ]
  },
  macos: {
    name: 'macOS',
    description: 'Installation script for macOS using Homebrew and native tools',
    icon: '🍎',
    fileExtension: '.sh',
    requirements: [
      'macOS 11+ (Big Sur or newer)',
      'Homebrew package manager',
      'Xcode Command Line Tools',
      'Admin privileges',
      'At least 8GB RAM'
    ],
    features: [
      'Homebrew-based package management',
      'Native macOS integration',
      'FFmpeg with hardware acceleration',
      'Local development setup',
      'Terminal-based installation'
    ]
  },
  docker: {
    name: 'Docker',
    description: 'Containerized deployment using Docker with multi-service architecture',
    icon: '🐳',
    fileExtension: '.dockerfile',
    requirements: [
      'Docker Engine 20.10+',
      'Docker Compose V2',
      'At least 4GB available RAM',
      'Network access for image downloads',
      'Linux host (recommended)'
    ],
    features: [
      'Isolated container environment',
      'Easy deployment and scaling',
      'Volume persistence',
      'Network isolation',
      'Production-ready configuration'
    ]
  },
  dockerCompose: {
    name: 'Docker Compose',
    description: 'Multi-container setup with separate services for frontend, backend, and database',
    icon: '🐙',
    fileExtension: '.yml',
    requirements: [
      'Docker Compose V2',
      'Docker Engine 20.10+',
      'Available ports: 80, 443, 3001, 5060',
      'Persistent storage for data',
      'Network connectivity'
    ],
    features: [
      'Multi-service architecture',
      'Service orchestration',
      'Volume management',
      'Network configuration',
      'Environment variable management',
      'Health checks and restart policies'
    ]
  }
};
