
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { JSMpegPlayer } from './JSMpegPlayer';
import { getJSMpegUrl } from '@/config/environment';

interface UniversalVideoPlayerProps {
  cameraId: number;
  rtspUrl?: string;
  name?: string;
  isActive: boolean;
  onLog?: (msg: string) => void;
  className?: string;
}

type StreamType = 'jsmpeg' | 'webrtc' | 'hls' | 'none';

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  cameraId,
  rtspUrl,
  name,
  isActive,
  onLog,
  className = "w-full h-full"
}) => {
  const [currentStreamType, setCurrentStreamType] = useState<StreamType>('none');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [lastConnectionTime, setLastConnectionTime] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);
  const connectionStateRef = useRef<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

  const logMessage = useCallback((msg: string) => {
    onLog?.(msg);
    console.log(`[UniversalPlayer Camera ${cameraId}] ${msg}`);
  }, [cameraId, onLog]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    setCurrentStreamType('none');
    setIsConnecting(false);
    setConnectionAttempt(0);
    connectionStateRef.current = 'idle';
    isInitializedRef.current = false;
  }, []);

  // Exponential backoff for reconnection attempts
  const getBackoffDelay = (attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Cap at 30 seconds
  };

  // Check if we should attempt connection (rate limiting)
  const shouldAttemptConnection = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionTime;
    const minDelay = getBackoffDelay(connectionAttempt);
    
    return timeSinceLastAttempt >= minDelay;
  }, [connectionAttempt, lastConnectionTime]);

  // Stream connection logic with improved error handling
  const attemptConnection = useCallback(async () => {
    if (!isActive || !rtspUrl || connectionStateRef.current === 'connecting') {
      return;
    }

    if (!shouldAttemptConnection()) {
      logMessage(`Rate limiting connection attempt (attempt ${connectionAttempt + 1})`);
      return;
    }

    connectionStateRef.current = 'connecting';
    setIsConnecting(true);
    setLastConnectionTime(Date.now());
    
    const attempt = connectionAttempt + 1;
    setConnectionAttempt(attempt);
    
    logMessage(`Attempting connection (attempt ${attempt}) with backoff delay`);

    try {
      // Try JSMpeg first for ultra-low latency
      setCurrentStreamType('jsmpeg');
      logMessage('Attempting JSMpeg stream...');
      // JSMpegPlayer will handle its own connection logic
    } catch (error: any) {
      logMessage(`JSMpeg setup failed: ${error.message}`);
      setCurrentStreamType('webrtc');
      connectionStateRef.current = 'failed';
      setIsConnecting(false);
    }
  }, [isActive, rtspUrl, connectionAttempt, shouldAttemptConnection, logMessage]);

  // Handle active state changes with proper initialization control
  useEffect(() => {
    if (!isActive || !rtspUrl) {
      cleanup();
      return;
    }

    // Only initialize once and prevent rapid reinitializations
    if (!isInitializedRef.current && connectionStateRef.current === 'idle') {
      isInitializedRef.current = true;
      logMessage(`Stream configured with URL: ${rtspUrl}`);
      
      // Small delay to prevent immediate reconnection loops
      const initTimeout = setTimeout(() => {
        attemptConnection();
      }, 100);

      return () => clearTimeout(initTimeout);
    }
  }, [isActive, rtspUrl, attemptConnection, cleanup, logMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle JSMpeg player events with improved state management
  const handleJSMpegConnected = useCallback(() => {
    logMessage('JSMpeg stream connected successfully');
    setIsConnecting(false);
    setCurrentStreamType('jsmpeg');
    setConnectionAttempt(0);
    connectionStateRef.current = 'connected';
    isInitializedRef.current = true;
  }, [logMessage]);

  const handleJSMpegDisconnected = useCallback(() => {
    logMessage('JSMpeg stream disconnected');
    connectionStateRef.current = 'failed';
    
    if (isActive && rtspUrl) {
      logMessage('Falling back to WebRTC/HLS...');
      setCurrentStreamType('webrtc');
      
      // Schedule reconnection attempt with backoff
      if (connectionAttempt < 5) {
        const delay = getBackoffDelay(connectionAttempt);
        logMessage(`Scheduling reconnection in ${delay}ms`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isActive && rtspUrl) {
            isInitializedRef.current = false;
            attemptConnection();
          }
        }, delay);
      }
    } else {
      setCurrentStreamType('none');
    }
  }, [isActive, rtspUrl, logMessage, connectionAttempt, attemptConnection]);

  const handleJSMpegError = useCallback((error: string) => {
    logMessage(`JSMpeg error: ${error}`);
    connectionStateRef.current = 'failed';
    setCurrentStreamType('webrtc');
    setIsConnecting(false);
    
    // Don't immediately retry on error, let the backoff handle it
    if (connectionAttempt < 5) {
      const delay = getBackoffDelay(connectionAttempt);
      logMessage(`Will retry in ${delay}ms due to error`);
    }
  }, [logMessage, connectionAttempt]);

  // Get stream indicator info
  const getStreamIndicator = () => {
    if (isConnecting) return { text: 'Connecting...', color: 'text-yellow-400' };
    
    switch (currentStreamType) {
      case 'jsmpeg':
        return { text: 'Ultra Low Latency', color: 'text-green-400' };
      case 'webrtc':
        return { text: 'Low Latency', color: 'text-blue-400' };
      case 'hls':
        return { text: 'Standard', color: 'text-orange-400' };
      case 'none':
      default:
        return { text: 'Offline', color: 'text-gray-400' };
    }
  };

  const indicator = getStreamIndicator();

  const renderPlayer = () => {
    if (!isActive || !rtspUrl) {
      return (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-sm">
              {rtspUrl ? 'Camera Offline' : 'No Stream URL'}
            </div>
            {name && (
              <div className="text-gray-500 text-xs mt-1">{name}</div>
            )}
          </div>
        </div>
      );
    }

    switch (currentStreamType) {
      case 'jsmpeg':
        return (
          <JSMpegPlayer
            cameraId={cameraId}
            wsUrl={getJSMpegUrl(cameraId)}
            onConnected={handleJSMpegConnected}
            onDisconnected={handleJSMpegDisconnected}
            onError={handleJSMpegError}
            className={className}
          />
        );
      
      case 'webrtc':
      case 'hls':
      default:
        return (
          <VideoPlayer
            cameraId={cameraId}
            isActive={isActive}
            onLog={onLog}
          />
        );
    }
  };

  return (
    <div className="relative w-full h-full">
      {renderPlayer()}
      
      {/* Enhanced stream indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className={indicator.color}>{indicator.text}</span>
        {connectionAttempt > 1 && (
          <div className="text-xs text-gray-400 mt-1">
            Attempt: {connectionAttempt}/5
          </div>
        )}
      </div>

      {/* Connection status overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
            Connecting to stream...
          </div>
        </div>
      )}
    </div>
  );
};
