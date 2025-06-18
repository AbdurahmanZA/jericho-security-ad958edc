
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

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    backend: {
      apiUrl: 'http://192.168.0.138/api',
      wsUrl: 'ws://192.168.0.138/ws',
      webrtcSignalingUrl: 'ws://192.168.0.138/api/ws',
    },
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
    backend: {
      apiUrl: 'http://192.168.0.138/api',
      wsUrl: 'ws://192.168.0.138/ws',
      webrtcSignalingUrl: 'ws://192.168.0.138/api/ws',
    },
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
    backend: {
      apiUrl: 'http://192.168.0.138/api',
      wsUrl: 'ws://192.168.0.138/ws',
      webrtcSignalingUrl: 'ws://192.168.0.138/api/ws',
    },
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
