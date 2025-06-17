
export const checkHLSAvailability = async (
  cameraId: number,
  hlsUrl: string,
  onLog?: (msg: string) => void,
  updateCameraState?: (id: number, updates: any) => void
): Promise<boolean> => {
  try {
    const response = await fetch(hlsUrl, { method: 'HEAD' });
    onLog?.(`HLS file check for Camera ${cameraId}: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      onLog?.(`HLS file not found for Camera ${cameraId}. Backend may still be processing RTSP stream.`);
      updateCameraState?.(cameraId, { 
        hlsAvailable: false, 
        lastError: `HLS file not ready (${response.status})` 
      });
      return false;
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    onLog?.(`HLS file check failed for Camera ${cameraId}: ${errorMessage}`);
    updateCameraState?.(cameraId, { 
      hlsAvailable: false, 
      lastError: `Cannot access HLS file: ${errorMessage}` 
    });
    return false;
  }
};
