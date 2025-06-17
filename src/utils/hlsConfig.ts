
export const getHLSConfig = () => ({
  enableWorker: false,
  lowLatencyMode: true,
  backBufferLength: 30,
  maxBufferLength: 15,
  maxMaxBufferLength: 30,
  startLevel: -1,
  capLevelToPlayerSize: true,
  debug: false,
  maxBufferSize: 60 * 1000 * 1000,
  maxBufferHole: 0.5,
  // Add more aggressive error recovery
  manifestLoadingTimeOut: 20000,
  manifestLoadingMaxRetry: 3,
  manifestLoadingRetryDelay: 1000,
  levelLoadingTimeOut: 20000,
  levelLoadingMaxRetry: 3,
  levelLoadingRetryDelay: 1000,
  fragLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 3,
  fragLoadingRetryDelay: 1000,
});

export const getHLSUrl = (cameraId: number): string => `/hls/camera_${cameraId}.m3u8`;
