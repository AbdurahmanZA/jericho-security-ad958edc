
import { useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";

export interface HLSPlayer {
  setupHLSPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void, updateCameraState?: (id: number, updates: any) => void) => void;
  cleanupHLSPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  hlsInstancesRef: React.MutableRefObject<Record<number, Hls>>;
}

export const useCameraHLS = (): HLSPlayer => {
  const hlsInstancesRef = useRef<Record<number, Hls>>({});

  const cleanupHLSPlayer = useCallback((cameraId: number, onLog?: (msg: string) => void) => {
    const hls = hlsInstancesRef.current[cameraId];
    if (hls) {
      onLog?.(`Cleaning up HLS player for Camera ${cameraId}`);
      try {
        hls.destroy();
      } catch (error) {
        onLog?.(`Error destroying HLS player for Camera ${cameraId}: ${error}`);
      }
      delete hlsInstancesRef.current[cameraId];
    }
  }, []);

  const setupHLSPlayer = useCallback((
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    if (!videoElement) {
      onLog?.(`HLS setup failed for Camera ${cameraId}: No video element`);
      return;
    }

    // Clean up any existing HLS player for this camera
    cleanupHLSPlayer(cameraId, onLog);

    const hlsUrl = `/hls/camera_${cameraId}.m3u8`;
    onLog?.(`Setting up HLS for Camera ${cameraId} with URL: ${hlsUrl}`);

    // First, check if the HLS file exists
    fetch(hlsUrl, { method: 'HEAD' })
      .then(response => {
        onLog?.(`HLS file check for Camera ${cameraId}: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          onLog?.(`HLS file not found for Camera ${cameraId}. Backend may still be processing RTSP stream.`);
          updateCameraState?.(cameraId, { 
            hlsAvailable: false, 
            lastError: `HLS file not ready (${response.status})` 
          });
          
          // Retry after a delay
          setTimeout(() => {
            onLog?.(`Retrying HLS setup for Camera ${cameraId} after 3 seconds...`);
            setupHLSPlayer(cameraId, videoElement, onLog, updateCameraState);
          }, 3000);
          return;
        }

        // File exists, proceed with HLS setup
        setupHLSWithFile(cameraId, videoElement, hlsUrl, onLog, updateCameraState);
      })
      .catch(error => {
        onLog?.(`HLS file check failed for Camera ${cameraId}: ${error.message}`);
        updateCameraState?.(cameraId, { 
          hlsAvailable: false, 
          lastError: `Cannot access HLS file: ${error.message}` 
        });
      });
  }, [cleanupHLSPlayer]);

  const setupHLSWithFile = (
    cameraId: number,
    videoElement: HTMLVideoElement,
    hlsUrl: string,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    if (Hls.isSupported()) {
      onLog?.(`Creating HLS instance for Camera ${cameraId}`);
      
      const hls = new Hls({
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

      hlsInstancesRef.current[cameraId] = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        onLog?.(`HLS manifest parsed for Camera ${cameraId}, levels: ${data.levels.length}`);
        updateCameraState?.(cameraId, { hlsAvailable: true });

        videoElement.play().catch(error => {
          onLog?.(`Autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });

      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        onLog?.(`Loading HLS manifest for Camera ${cameraId} from ${hlsUrl}`);
      });

      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        onLog?.(`HLS manifest loaded successfully for Camera ${cameraId}`);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        onLog?.(`HLS level loaded for Camera ${cameraId}: ${data.details.fragments.length} fragments`);
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        onLog?.(`HLS fragment loaded for Camera ${cameraId}`);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        onLog?.(`HLS error for Camera ${cameraId}: ${data.type} - ${data.details} - Fatal: ${data.fatal}`);
        onLog?.(`HLS error details: ${JSON.stringify(data, null, 2)}`);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              onLog?.(`HLS network error for Camera ${cameraId}, attempting recovery...`);
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId] === hls) {
                  onLog?.(`Restarting HLS load for Camera ${cameraId}`);
                  hls.startLoad();
                }
              }, 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              onLog?.(`HLS media error for Camera ${cameraId}, attempting recovery...`);
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId] === hls) {
                  onLog?.(`Recovering HLS media error for Camera ${cameraId}`);
                  hls.recoverMediaError();
                }
              }, 2000);
              break;
            default:
              onLog?.(`Fatal HLS error for Camera ${cameraId}, cleaning up...`);
              cleanupHLSPlayer(cameraId, onLog);
              updateCameraState?.(cameraId, { 
                hlsAvailable: false, 
                lastError: `HLS Fatal Error: ${data.details}` 
              });
          }
        }
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      onLog?.(`Using Safari native HLS for Camera ${cameraId}`);
      videoElement.src = hlsUrl;
      
      videoElement.addEventListener("loadedmetadata", () => {
        onLog?.(`Safari HLS metadata loaded for Camera ${cameraId}`);
        updateCameraState?.(cameraId, { hlsAvailable: true });
        videoElement.play().catch(error => {
          onLog?.(`Safari autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });

      videoElement.addEventListener("error", (e) => {
        onLog?.(`Safari HLS error for Camera ${cameraId}: ${e}`);
        updateCameraState?.(cameraId, { 
          hlsAvailable: false, 
          lastError: "Safari HLS playback error" 
        });
      });
    } else {
      onLog?.(`HLS not supported for Camera ${cameraId}`);
      updateCameraState?.(cameraId, { 
        hlsAvailable: false, 
        lastError: "HLS not supported by browser" 
      });
    }
  };

  // Cleanup all HLS instances when unmounting
  useEffect(() => {
    return () => {
      Object.keys(hlsInstancesRef.current).forEach(id => {
        const hls = hlsInstancesRef.current[Number(id)];
        if (hls) {
          try {
            hls.destroy();
          } catch (error) {
            console.warn(`Error destroying HLS instance ${id}:`, error);
          }
        }
      });
      hlsInstancesRef.current = {};
    };
  }, []);

  return { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef };
};
