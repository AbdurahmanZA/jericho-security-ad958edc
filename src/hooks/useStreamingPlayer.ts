
import { useRef, useCallback } from "react";
import { useCameraHLS } from "./useCameraHLS";

export interface StreamingPlayer {
  setupPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void, updateCameraState?: (id: number, updates: any) => void) => void;
  cleanupPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  hlsInstancesRef: React.MutableRefObject<Record<number, any>>;
}

export const useStreamingPlayer = (): StreamingPlayer => {
  const { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef } = useCameraHLS();

  const setupPlayer = useCallback((
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void,
    updateCameraState?: (id: number, updates: any) => void
  ) => {
    onLog?.(`[VideoPlayer ${cameraId}] Setting up HLS stream (optimized for multiple cameras)`);
    setupHLSPlayer(cameraId, videoElement, onLog, updateCameraState);
  }, [setupHLSPlayer]);

  const cleanupPlayer = useCallback((cameraId: number, onLog?: (msg: string) => void) => {
    onLog?.(`[VideoPlayer ${cameraId}] Cleaning up HLS stream`);
    cleanupHLSPlayer(cameraId, onLog);
  }, [cleanupHLSPlayer]);

  return { setupPlayer, cleanupPlayer, hlsInstancesRef };
};
