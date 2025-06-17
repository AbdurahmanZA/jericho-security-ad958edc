
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
  const hasAttemptedConnectionRef = useRef<boolean>(false);
  
  const { setupWebRTCPlayer, cleanupWebRTCPlayer } = useWebRTC();
  const { setupHLSPlayer, cleanupHLSPlayer } = useCameraHLS();

  // Stable log function
  const logMessage = useCallback((msg: string) => {
    console.log(`[VideoPlayer ${cameraId}] ${msg}`);
    onLog?.(msg);
  }, [onLog, cameraId]);

  // Stable camera state update function
  const updateState = useCallback((updates: any) => {
    updateCameraState?.(cameraId, updates);
  }, [updateCameraState, cameraId]);

  // Stable cleanup function
  const cleanup = useCallback(() => {
    logMessage(`Cleaning up all connections`);
    cleanupWebRTCPlayer(cameraId, logMessage);
    cleanupHLSPlayer(cameraId, logMessage);
    setStreamType('none');
    setIsConnecting(false);
    isConnectionInProgressRef.current = false;
    hasAttemptedConnectionRef.current = false;
  }, [cameraId, cleanupWebRTCPlayer, cleanupHLSPlayer, logMessage]);

  // Stable connection attempt function
  const attemptConnection = useCallback(async () => {
    // Guard: Check if already attempted for this activation
    if (hasAttemptedConnectionRef.current) {
      logMessage(`Connection already attempted for this activation, skipping`);
      return;
    }

    // Guard: Check if not active or no video element
    if (!isActive || !videoRef.current) {
      logMessage(`Skipping connection - not active or no video element`);
      return;
    }

    // Guard: Prevent multiple simultaneous attempts
    if (isConnectionInProgressRef.current) {
      logMessage(`Connection already in progress, skipping`);
      return;
    }

    // Mark that we've attempted connection for this activation
    hasAttemptedConnectionRef.current = true;
    isConnectionInProgressRef.current = true;
    setIsConnecting(true);

    const currentAttempt = ++connectionAttemptRef.current;
    logMessage(`Starting connection attempt ${currentAttempt}`);

    try {
      // Clean up any existing connections first
      cleanupWebRTCPlayer(cameraId, logMessage);
      cleanupHLSPlayer(cameraId, logMessage);

      // Try WebRTC first
      logMessage(`Trying WebRTC (attempt ${currentAttempt})`);
      const webrtcSuccess = await setupWebRTCPlayer(cameraId, videoRef.current, logMessage);
      
      // Check if this is still the current attempt and camera is still active
      if (currentAttempt !== connectionAttemptRef.current || !isActive) {
        logMessage(`Outdated attempt ${currentAttempt}, aborting`);
        return;
      }
      
      if (webrtcSuccess) {
        setStreamType('webrtc');
        setIsConnecting(false);
        isConnectionInProgressRef.current = false;
        logMessage(`Connected via WebRTC (low latency)`);
        updateState({ connectionType: 'webrtc', hlsAvailable: false });
        return;
      }

      // Fallback to HLS after a short delay
      logMessage(`WebRTC failed, falling back to HLS`);
      
      setTimeout(() => {
        if (currentAttempt === connectionAttemptRef.current && videoRef.current && isActive) {
          setupHLSPlayer(cameraId, videoRef.current, logMessage, updateState);
          setStreamType('hls');
          setIsConnecting(false);
          isConnectionInProgressRef.current = false;
          logMessage(`Connected via HLS (standard latency)`);
        } else {
          setIsConnecting(false);
          isConnectionInProgressRef.current = false;
        }
      }, 1000);

    } catch (error) {
      if (currentAttempt === connectionAttemptRef.current) {
        setIsConnecting(false);
        isConnectionInProgressRef.current = false;
        logMessage(`Connection failed: ${error}`);
      }
    }
  }, [isActive, cameraId, setupWebRTCPlayer, setupHLSPlayer, logMessage, updateState, cleanupWebRTCPlayer, cleanupHLSPlayer]);

  // Effect for handling active state changes
  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    // Reset the attempt flag when becoming active
    hasAttemptedConnectionRef.current = false;

    // Only attempt connection if video element is ready and no connection is in progress
    if (videoRef.current && !isConnectionInProgressRef.current && !hasAttemptedConnectionRef.current) {
      // Small delay to ensure video element is properly mounted
      const timer = setTimeout(() => {
        attemptConnection();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isActive, cleanup, attemptConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Stream indicator
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
        Your browser does not support video playback.
      </video>
      
      {/* Stream type indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className={streamIndicator.color}>{streamIndicator.text}</span>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
