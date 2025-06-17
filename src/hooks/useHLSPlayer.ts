
import { useRef, useCallback } from "react";
import Hls from "hls.js";
import { getHLSConfig } from "@/utils/hlsConfig";

export interface HLSPlayerInstance {
  setupHLSInstance: (cameraId: number, videoElement: HTMLVideoElement, hlsUrl: string, onLog?: (msg: string) => void, updateCameraState?: (id: number, updates: any) => void) => void;
  cleanupHLSInstance: (cameraId: number, onLog?: (msg: string) => void) => void;
  hlsInstancesRef: React.MutableRefObject<Record<number, Hls>>;
}

export const useHLSPlayer = (): HLSPlayerInstance => {
  const hlsInstancesRef = useRef<Record<number, Hls>>({});

  const cleanupHLSInstance = useCallback((cameraId: number, onLog?: (msg: string) => void) => {
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

  const setupSafariHLS = (
    cameraId: number,
    videoElement: HTMLVideoElement,
    hlsUrl: string,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
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
  };

  const setupHLSWithHlsJs = (
    cameraId: number,
    videoElement: HTMLVideoElement,
    hlsUrl: string,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    onLog?.(`Creating HLS instance for Camera ${cameraId}`);
    
    const hls = new Hls(getHLSConfig());
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
            cleanupHLSInstance(cameraId, onLog);
            updateCameraState?.(cameraId, { 
              hlsAvailable: false, 
              lastError: `HLS Fatal Error: ${data.details}` 
            });
        }
      }
    });
  };

  const setupHLSInstance = useCallback((
    cameraId: number,
    videoElement: HTMLVideoElement,
    hlsUrl: string,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    if (!videoElement) {
      onLog?.(`HLS setup failed for Camera ${cameraId}: No video element`);
      return;
    }

    // Clean up any existing HLS player for this camera
    cleanupHLSInstance(cameraId, onLog);

    if (Hls.isSupported()) {
      setupHLSWithHlsJs(cameraId, videoElement, hlsUrl, onLog, updateCameraState);
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      setupSafariHLS(cameraId, videoElement, hlsUrl, onLog, updateCameraState);
    } else {
      onLog?.(`HLS not supported for Camera ${cameraId}`);
      updateCameraState?.(cameraId, { 
        hlsAvailable: false, 
        lastError: "HLS not supported by browser" 
      });
    }
  }, [cleanupHLSInstance]);

  return { setupHLSInstance, cleanupHLSInstance, hlsInstancesRef };
};
