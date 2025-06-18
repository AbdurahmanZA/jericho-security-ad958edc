
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { JSMpegPlayer } from './JSMpegPlayer';
import { RTSPStreamManager, StreamStatus } from '@/services/RTSPStreamManager';

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
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const streamManagerRef = useRef<RTSPStreamManager | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const logMessage = useCallback((msg: string) => {
    onLog?.(msg);
    console.log(`[UniversalPlayer Camera ${cameraId}] ${msg}`);
  }, [cameraId, onLog]);

  // Initialize stream manager
  useEffect(() => {
    const handleStatusUpdate = (status: StreamStatus) => {
      if (status.cameraId === cameraId) {
        setStreamStatus(status);
        setCurrentStreamType(status.streamType);
        setIsConnecting(false);
        logMessage(`Stream status updated: ${status.streamType} (active: ${status.isActive})`);
      }
    };

    streamManagerRef.current = new RTSPStreamManager(handleStatusUpdate, logMessage);
    logMessage('Stream manager initialized');

    return () => {
      if (streamManagerRef.current) {
        streamManagerRef.current.destroy();
        logMessage('Stream manager destroyed');
      }
    };
  }, [cameraId, logMessage]);

  // Configure stream when URL is available
  useEffect(() => {
    if (streamManagerRef.current && rtspUrl) {
      streamManagerRef.current.addStream({
        cameraId,
        rtspUrl,
        name,
        type: 'jsmpeg',
        quality: 'medium',
        priority: 1
      });
      logMessage(`Stream configured with URL: ${rtspUrl}`);
    }
  }, [cameraId, rtspUrl, name, logMessage]);

  // Handle active state changes
  useEffect(() => {
    if (!streamManagerRef.current) return;

    if (isActive && rtspUrl) {
      setIsConnecting(true);
      logMessage('Starting universal stream...');
      
      streamManagerRef.current.startStream(cameraId).then(success => {
        if (!success) {
          setIsConnecting(false);
          setCurrentStreamType('none');
          logMessage('All stream types failed to start - falling back to VideoPlayer');
        }
      });
    } else {
      streamManagerRef.current.stopStream(cameraId);
      setCurrentStreamType('none');
      setIsConnecting(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      logMessage('Stream stopped');
    }
  }, [isActive, rtspUrl, cameraId, logMessage]);

  // Handle JSMpeg player events
  const handleJSMpegConnected = useCallback(() => {
    logMessage('JSMpeg stream connected successfully');
    setIsConnecting(false);
    setCurrentStreamType('jsmpeg');
  }, [logMessage]);

  const handleJSMpegDisconnected = useCallback(() => {
    logMessage('JSMpeg stream disconnected');
    setCurrentStreamType('none');
    if (isActive && streamManagerRef.current) {
      logMessage('Attempting to reconnect...');
      reconnectTimeoutRef.current = setTimeout(() => {
        setIsConnecting(true);
        streamManagerRef.current?.startStream(cameraId);
      }, 3000);
    }
  }, [isActive, cameraId, logMessage]);

  const handleJSMpegError = useCallback((error: string) => {
    logMessage(`JSMpeg error: ${error}`);
    setCurrentStreamType('none');
    if (streamManagerRef.current) {
      logMessage('Falling back to alternative stream types...');
      streamManagerRef.current.startStream(cameraId);
    }
  }, [cameraId, logMessage]);

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
    if (!isActive || currentStreamType === 'none') {
      // Always fall back to VideoPlayer for WebRTC/HLS when JSMpeg is not available
      if (isActive && rtspUrl) {
        return (
          <VideoPlayer
            cameraId={cameraId}
            isActive={isActive}
            onLog={onLog}
          />
        );
      }
      
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
        {streamStatus && streamStatus.reconnectAttempts > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            Retry: {streamStatus.reconnectAttempts}
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
