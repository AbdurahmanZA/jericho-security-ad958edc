
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCameraHLS } from '@/hooks/useCameraHLS';

interface VideoPlayerProps {
  cameraId: number;
  isActive: boolean;
  onLog?: (msg: string) => void;
  updateCameraState?: (i: number, updates: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({
  cameraId,
  isActive,
  onLog,
  updateCameraState
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamType, setStreamType] = useState<'webrtc' | 'hls' | 'none'>('none');
  const [isConnecting, setIsConnecting] = useState(false);
  const connectionAttemptRef = useRef<number>(0);
  const isConnectionInProgressRef = useRef<boolean>(false);
  
  const { setupWebRTCPlayer, cleanupWebRTCPlayer } = useWebRTC();
  const { setupHLSPlayer, cleanupHLSPlayer } = useCameraHLS();

  // Memoize the log function to prevent unnecessary re-renders
  const logMessage = useCallback((msg: string) => {
    onLog?.(msg);
  }, [onLog]);

  // Memoize the camera state update function
  const updateState = useCallback((updates: any) => {
    updateCameraState?.(cameraId, updates);
  }, [updateCameraState, cameraId]);

  // Cleanup function
  const cleanup = useCallback(() => {
    logMessage(`Cleaning up all connections for Camera ${cameraId}`);
    cleanupWebRTCPlayer(cameraId, logMessage);
    cleanupHLSPlayer(cameraId, logMessage);
    setStreamType('none');
    setIsConnecting(false);
    isConnectionInProgressRef.current = false;
  }, [cameraId, cleanupWebRTCPlayer, cleanupHLSPlayer, logMessage]);

  // Connection attempt function with proper guards
  const attemptConnection = useCallback(async () => {
    if (!isActive || !videoRef.current) {
      logMessage(`Skipping connection attempt for Camera ${cameraId} - not active or no video element`);
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectionInProgressRef.current) {
      logMessage(`Connection already in progress for Camera ${cameraId}, skipping`);
      return;
    }

    const currentAttempt = ++connectionAttemptRef.current;
    isConnectionInProgressRef.current = true;
    setIsConnecting(true);
    logMessage(`Starting connection attempt ${currentAttempt} for Camera ${cameraId}`);

    try {
      // First clean up any existing connections
      cleanupWebRTCPlayer(cameraId, logMessage);
      cleanupHLSPlayer(cameraId, logMessage);

      // Try WebRTC first
      logMessage(`Trying WebRTC for Camera ${cameraId} (attempt ${currentAttempt})`);
      const webrtcSuccess = await setupWebRTCPlayer(cameraId, videoRef.current, logMessage);
      
      // Check if this is still the current attempt
      if (currentAttempt !== connectionAttemptRef.current) {
        logMessage(`Outdated attempt ${currentAttempt} for Camera ${cameraId}, aborting`);
        return;
      }
      
      if (webrtcSuccess) {
        setStreamType('webrtc');
        setIsConnecting(false);
        isConnectionInProgressRef.current = false;
        logMessage(`Camera ${cameraId} connected via WebRTC (low latency)`);
        updateState({ connectionType: 'webrtc', hlsAvailable: false });
        return;
      }

      // Fallback to HLS after a short delay
      logMessage(`WebRTC failed for Camera ${cameraId}, falling back to HLS`);
      
      setTimeout(() => {
        if (currentAttempt === connectionAttemptRef.current && videoRef.current && isActive) {
          setupHLSPlayer(cameraId, videoRef.current, logMessage, updateState);
          setStreamType('hls');
          setIsConnecting(false);
          isConnectionInProgressRef.current = false;
          logMessage(`Camera ${cameraId} connected via HLS (standard latency)`);
        } else {
          isConnectionInProgressRef.current = false;
        }
      }, 1000);

    } catch (error) {
      if (currentAttempt === connectionAttemptRef.current) {
        setIsConnecting(false);
        isConnectionInProgressRef.current = false;
        logMessage(`Connection failed for Camera ${cameraId}: ${error}`);
      }
    }
  }, [isActive, cameraId, setupWebRTCPlayer, setupHLSPlayer, logMessage, updateState, cleanupWebRTCPlayer, cleanupHLSPlayer]);

  // Main effect for handling active state changes
  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    // Only attempt connection if video element is ready and no connection is in progress
    if (videoRef.current && !isConnectionInProgressRef.current) {
      attemptConnection();
    }

    return cleanup;
  }, [isActive, attemptConnection, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Memoize the stream indicator to prevent unnecessary re-calculations
  const streamIndicator = useMemo(() => {
    if (isConnecting) return { text: 'Connecting...', color: 'text-yellow-400' };
    switch (streamType) {
      case 'webrtc': return { text: 'Live', color: 'text-green-400' };
      case 'hls': return { text: 'Streaming', color: 'text-blue-400' };
      default: return { text: 'Offline', color: 'text-gray-400' };
    }
  }, [isConnecting, streamType]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        autoPlay
        muted
        playsInline
        controls={false}
      >
        Your browser does not support video playbook.
      </video>
      
      {/* Stream type indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className={streamIndicator.color}>{streamIndicator.text}</span>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
