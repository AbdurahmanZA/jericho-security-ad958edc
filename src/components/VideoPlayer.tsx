
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCameraHLS } from '@/hooks/useCameraHLS';
import { config } from '@/config/environment';

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
    cleanupWebRTCPlayer(cameraId, logMessage);
    cleanupHLSPlayer(cameraId, logMessage);
    setStreamType('none');
    setIsConnecting(false);
  }, [cameraId, cleanupWebRTCPlayer, cleanupHLSPlayer, logMessage]);

  // Connection attempt function with environment-aware configuration
  const attemptConnection = useCallback(async () => {
    if (!isActive || !videoRef.current) return;

    const currentAttempt = ++connectionAttemptRef.current;
    setIsConnecting(true);
    logMessage(`Attempting connection for Camera ${cameraId} (${config.name} mode)`);

    try {
      // Try WebRTC first if enabled
      if (config.streaming.enableWebRTC) {
        logMessage(`Trying WebRTC for Camera ${cameraId}`);
        const webrtcSuccess = await setupWebRTCPlayer(cameraId, videoRef.current, logMessage);
        
        // Check if this is still the current attempt
        if (currentAttempt !== connectionAttemptRef.current) return;
        
        if (webrtcSuccess) {
          setStreamType('webrtc');
          setIsConnecting(false);
          logMessage(`Camera ${cameraId} connected via WebRTC (low latency)`);
          updateState({ connectionType: 'webrtc', hlsAvailable: false });
          return;
        }
      }

      // Fallback to HLS if enabled
      if (config.streaming.enableHLS) {
        logMessage(`WebRTC failed for Camera ${cameraId}, falling back to HLS`);
        
        // Small delay before trying HLS
        setTimeout(() => {
          if (currentAttempt === connectionAttemptRef.current && videoRef.current && isActive) {
            setupHLSPlayer(cameraId, videoRef.current, logMessage, updateState);
            setStreamType('hls');
            setIsConnecting(false);
            logMessage(`Camera ${cameraId} connected via HLS (standard latency)`);
          }
        }, 1000);
      } else {
        setIsConnecting(false);
        logMessage(`No fallback streams available for Camera ${cameraId}`);
      }

    } catch (error) {
      if (currentAttempt === connectionAttemptRef.current) {
        setIsConnecting(false);
        logMessage(`Connection failed for Camera ${cameraId}: ${error}`);
      }
    }
  }, [isActive, cameraId, setupWebRTCPlayer, setupHLSPlayer, logMessage, updateState]);

  // Main effect for handling active state changes
  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    // Only attempt connection if video element is ready
    if (videoRef.current) {
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
        Your browser does not support video playback.
      </video>
      
      {/* Stream type indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className={streamIndicator.color}>{streamIndicator.text}</span>
        {config.name !== 'production' && (
          <div className="text-xs text-gray-400">({config.name})</div>
        )}
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
