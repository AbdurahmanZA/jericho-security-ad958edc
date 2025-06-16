
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
    if (!videoElement) return;

    // Clean up any existing HLS player for this camera
    cleanupHLSPlayer(cameraId, onLog);

    const hlsUrl = `/hls/camera_${cameraId}.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false,
        // Reduce CPU usage
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
      });

      hlsInstancesRef.current[cameraId] = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLog?.(`HLS manifest parsed for Camera ${cameraId}, attempting autoplay`);
        updateCameraState?.(cameraId, { hlsAvailable: true });

        videoElement.play().catch(error => {
          onLog?.(`Autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        onLog?.(`HLS error for Camera ${cameraId}: ${data.type} - ${data.details} - Fatal: ${data.fatal}`);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId] === hls) {
                  hls.startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId] === hls) {
                  hls.recoverMediaError();
                }
              }, 1000);
              break;
            default:
              cleanupHLSPlayer(cameraId, onLog);
              updateCameraState?.(cameraId, { hlsAvailable: false, lastError: `HLS Fatal Error: ${data.details}` });
          }
        }
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = hlsUrl;
      videoElement.addEventListener("loadedmetadata", () => {
        onLog?.(`Safari HLS metadata loaded for Camera ${cameraId}`);
        updateCameraState?.(cameraId, { hlsAvailable: true });
        videoElement.play().catch(error => {
          onLog?.(`Safari autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });
    } else {
      onLog?.(`HLS not supported for Camera ${cameraId}`);
      updateCameraState?.(cameraId, { hlsAvailable: false, lastError: "HLS not supported by browser" });
    }
  }, [cleanupHLSPlayer]);

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
