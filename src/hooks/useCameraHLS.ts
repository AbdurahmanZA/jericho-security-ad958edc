
import { useEffect, useCallback } from "react";
import { useHLSPlayer } from "./useHLSPlayer";
import { getHLSUrl } from "@/utils/hlsConfig";
import { checkHLSAvailability } from "@/utils/hlsFileChecker";

export interface HLSPlayer {
  setupHLSPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void, updateCameraState?: (id: number, updates: any) => void) => void;
  cleanupHLSPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  hlsInstancesRef: React.MutableRefObject<Record<number, any>>;
}

export const useCameraHLS = (): HLSPlayer => {
  const { setupHLSInstance, cleanupHLSInstance, hlsInstancesRef } = useHLSPlayer();

  const cleanupHLSPlayer = useCallback((cameraId: number, onLog?: (msg: string) => void) => {
    cleanupHLSInstance(cameraId, onLog);
  }, [cleanupHLSInstance]);

  const setupHLSPlayer = useCallback((
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    const hlsUrl = getHLSUrl(cameraId);
    onLog?.(`Setting up HLS for Camera ${cameraId} with URL: ${hlsUrl}`);

    // First, check if the HLS file exists
    checkHLSAvailability(cameraId, hlsUrl, onLog, updateCameraState)
      .then(isAvailable => {
        if (isAvailable) {
          // File exists, proceed with HLS setup
          setupHLSInstance(cameraId, videoElement, hlsUrl, onLog, updateCameraState);
        } else {
          // Retry after a delay
          setTimeout(() => {
            onLog?.(`Retrying HLS setup for Camera ${cameraId} after 3 seconds...`);
            setupHLSPlayer(cameraId, videoElement, onLog, updateCameraState);
          }, 3000);
        }
      });
  }, [setupHLSInstance]);

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
