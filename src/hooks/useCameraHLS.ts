
import { useEffect, useRef } from "react";
import Hls from "hls.js";

export interface HLSPlayer {
  setupHLSPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void, updateCameraState?: (id: number, updates: any) => void) => void;
  cleanupHLSPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  hlsInstancesRef: React.MutableRefObject<Record<number, Hls>>;
}

export const useCameraHLS = (): HLSPlayer => {
  const hlsInstancesRef = useRef<Record<number, Hls>>({});

  const setupHLSPlayer = (
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    if (!videoElement) return;

    // Clean up any existing HLS player for this camera
    if (hlsInstancesRef.current[cameraId]) {
      hlsInstancesRef.current[cameraId].destroy();
      delete hlsInstancesRef.current[cameraId];
      onLog?.(`Cleaning up HLS player for Camera ${cameraId}`);
    }

    const hlsUrl = `/hls/camera_${cameraId}.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false,
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
              setTimeout(() => hls.startLoad(), 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setTimeout(() => hls.recoverMediaError(), 1000);
              break;
            default:
              hls.destroy();
              delete hlsInstancesRef.current[cameraId];
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
  };

  const cleanupHLSPlayer = (cameraId: number, onLog?: (msg: string) => void) => {
    if (hlsInstancesRef.current[cameraId]) {
      onLog?.(`Cleaning up HLS player for Camera ${cameraId}`);
      hlsInstancesRef.current[cameraId].destroy();
      delete hlsInstancesRef.current[cameraId];
    }
  };

  // Cleanup all HLS instances when unmounting
  useEffect(() => {
    return () => {
      Object.keys(hlsInstancesRef.current).forEach(id => {
        hlsInstancesRef.current[Number(id)]?.destroy();
      });
    };
  }, []);

  return { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef };
};
