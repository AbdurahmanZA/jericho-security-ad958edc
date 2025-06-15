
import { useState } from "react";

export interface CameraState {
  retryCount: number;
  lastError: string;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed';
  lastAttempt: number;
  hlsAvailable: boolean;
}

export const useCameraState = () => {
  const [cameraStates, setCameraStates] = useState<Record<number, CameraState>>({});

  const initializeCameraState = (cameraId: number): CameraState => ({
    retryCount: 0,
    lastError: "",
    connectionStatus: "idle",
    lastAttempt: 0,
    hlsAvailable: false,
  });

  const updateCameraState = (cameraId: number, updates: Partial<CameraState>) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { ...prev[cameraId] || initializeCameraState(cameraId), ...updates }
    }));
  };

  return { cameraStates, updateCameraState, initializeCameraState };
};
