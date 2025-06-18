
export interface EnvironmentConfig {
  name: 'demo' | 'production' | 'development';
  backend: {
    apiUrl: string;
    wsUrl: string;
    webrtcSignalingUrl: string;
  };
  streaming: {
    hlsPath: string;
    jsmpegPath: string;
    enableWebRTC: boolean;
    enableJSMpeg: boolean;
    enableHLS: boolean;
    defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
    maxRetries: number;
    reconnectDelay: number;
  };
  hikvision: {
    enabled: boolean;
    defaultTimeout: number;
    maxConcurrentConnections: number;
  };
  demo: {
    sampleStreams: boolean;
    mockData: boolean;
    enableAllFeatures: boolean;
  };
}

const baseConfig = {
  streaming: {
    maxRetries: 5,
    reconnectDelay: 3000,
    defaultQuality: 'medium' as const,
  },
  hikvision: {
    defaultTimeout: 10000,
    maxConcurrentConnections: 10,
  },
};

// Auto-detect protocol and construct URLs dynamically with proper port handling
const getBackendUrls = () => {
  const isHttps = window.location.protocol === 'https:';
  const hostname = window.location.hostname || '192.168.0.138';
  const backendPort = '3001'; // Backend server runs on port 3001
  
  return {
    apiUrl: `${window.location.protocol}//${hostname}:${backendPort}/api`,
    wsUrl: `${isHttps ? 'wss' : 'ws'}://${hostname}:${backendPort}/api/ws`,
    webrtcSignalingUrl: `${isHttps ? 'wss' : 'ws'}://${hostname}:${backendPort}/api/ws`,
  };
};

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    backend: getBackendUrls(),
    streaming: {
      ...baseConfig.streaming,
      hlsPath: '/hls',
      jsmpegPath: '/jsmpeg',
      enableWebRTC: true,
      enableJSMpeg: true,
      enableHLS: true,
    },
    hikvision: {
      ...baseConfig.hikvision,
      enabled: true,
    },
    demo: {
      sampleStreams: false,
      mockData: false,
      enableAllFeatures: true,
    },
  },

  demo: {
    name: 'demo',
    backend: getBackendUrls(),
    streaming: {
      ...baseConfig.streaming,
      hlsPath: '/hls',
      jsmpegPath: '/jsmpeg',
      enableWebRTC: true,
      enableJSMpeg: true,
      enableHLS: true,
      defaultQuality: 'high',
    },
    hikvision: {
      ...baseConfig.hikvision,
      enabled: true,
    },
    demo: {
      sampleStreams: true,
      mockData: true,
      enableAllFeatures: true,
    },
  },

  production: {
    name: 'production',
    backend: getBackendUrls(),
    streaming: {
      ...baseConfig.streaming,
      hlsPath: '/hls',
      jsmpegPath: '/jsmpeg',
      enableWebRTC: true,
      enableJSMpeg: true,
      enableHLS: true,
      defaultQuality: 'medium',
    },
    hikvision: {
      ...baseConfig.hikvision,
      enabled: true,
    },
    demo: {
      sampleStreams: false,
      mockData: false,
      enableAllFeatures: false,
    },
  },
};

// Get current environment from environment variable or default to development
const getCurrentEnvironment = (): EnvironmentConfig => {
  const env = import.meta.env.VITE_APP_ENV || 'development';
  return environments[env] || environments.development;
};

export const config = getCurrentEnvironment();

export const isDemoMode = config.name === 'demo';
export const isProductionMode = config.name === 'production';
export const isDevelopmentMode = config.name === 'development';

// Helper functions for feature flags
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['streaming'] | keyof EnvironmentConfig['hikvision']): boolean => {
  if (feature in config.streaming) {
    return config.streaming[feature as keyof typeof config.streaming] as boolean;
  }
  if (feature in config.hikvision) {
    return config.hikvision[feature as keyof typeof config.hikvision] as boolean;
  }
  return false;
};

export const getStreamingConfig = () => config.streaming;
export const getHikvisionConfig = () => config.hikvision;
export const getBackendConfig = () => config.backend;
export const getDemoConfig = () => config.demo;

// Helper function to get JSMpeg WebSocket URL with proper port
export const getJSMpegUrl = (cameraId: number): string => {
  const hostname = window.location.hostname || '192.168.0.138';
  const backendPort = '3001';
  const isHttps = window.location.protocol === 'https:';
  return `${isHttps ? 'wss' : 'ws'}://${hostname}:${backendPort}/jsmpeg/${cameraId}`;
};
