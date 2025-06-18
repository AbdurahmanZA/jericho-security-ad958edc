
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { JSMpegPlayer } from './JSMpegPlayer';

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);

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
  }, []);

  // Stream connection logic
  const attemptConnection = useCallback(async () => {
    if (!isActive || !rtspUrl || isConnecting) {
      return;
    }

    setIsConnecting(true);
    const attempt = connectionAttempt + 1;
    setConnectionAttempt(attempt);
    
    logMessage(`Attempting connection (attempt ${attempt})`);

    // Try JSMpeg first for ultra-low latency
    try {
      setCurrentStreamType('jsmpeg');
      logMessage('Attempting JSMpeg stream...');
      // JSMpegPlayer will handle its own connection logic
      setIsConnecting(false);
    } catch (error) {
      logMessage(`JSMpeg failed: ${error.message}`);
      // Fall back to VideoPlayer (WebRTC/HLS)
      setCurrentStreamType('webrtc');
      setIsConnecting(false);
    }
  }, [isActive, rtspUrl, isConnecting, connectionAttempt, logMessage]);

  // Handle active state changes
  useEffect(() => {
    if (!isActive || !rtspUrl) {
      cleanup();
      return;
    }

    // Only initialize once per URL change
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      logMessage(`Stream configured with URL: ${rtspUrl}`);
      attemptConnection();
    }

    return () => {
      isInitializedRef.current = false;
    };
  }, [isActive, rtspUrl, attemptConnection, cleanup, logMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle JSMpeg player events
  const handleJSMpegConnected = useCallback(() => {
    logMessage('JSMpeg stream connected successfully');
    setIsConnecting(false);
    setCurrentStreamType('jsmpeg');
    setConnectionAttempt(0);
  }, [logMessage]);

  const handleJSMpegDisconnected = useCallback(() => {
    logMessage('JSMpeg stream disconnected');
    if (isActive && rtspUrl) {
      logMessage('Falling back to WebRTC/HLS...');
      setCurrentStreamType('webrtc');
    } else {
      setCurrentStreamType('none');
    }
  }, [isActive, rtspUrl, logMessage]);

  const handleJSMpegError = useCallback((error: string) => {
    logMessage(`JSMpeg error: ${error}`);
    setCurrentStreamType('webrtc');
    setIsConnecting(false);
  }, [logMessage]);

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
            wsUrl={`ws://192.168.0.138/jsmpeg/${cameraId}`}
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
            Attempt: {connectionAttempt}
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
