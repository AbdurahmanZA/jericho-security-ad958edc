
import React, { useRef, useEffect, useState } from 'react';
import { Play, Square, AlertTriangle, Clock, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStreamingPlayer } from '@/hooks/useStreamingPlayer';
import { CameraState } from '@/hooks/useCameraState';

interface VideoPlayerProps {
  cameraId: number;
  className?: string;
  autoStart?: boolean;
  onLog?: (msg: string) => void;
  showControls?: boolean;
  onSnapshot?: (cameraId: number) => void;
  updateCameraState?: (id: number, updates: Partial<CameraState>) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  cameraId,
  className = "",
  autoStart = false,
  onLog,
  showControls = true,
  onSnapshot,
  updateCameraState
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [lastError, setLastError] = useState<string>('');

  const { setupPlayer, cleanupPlayer } = useStreamingPlayer();

  const handleCameraStateUpdate = (id: number, updates: any) => {
    if (updates.hlsAvailable !== undefined) {
      setIsConnected(updates.hlsAvailable);
      setConnectionStatus(updates.hlsAvailable ? 'connected' : 'failed');
    }
    if (updates.lastError) {
      setLastError(updates.lastError);
    }
    
    // Pass updates to parent component if provided
    if (updateCameraState) {
      updateCameraState(id, updates);
    }
  };

  const handleSnapshot = () => {
    if (videoRef.current && onSnapshot) {
      onSnapshot(cameraId);
    }
  };

  useEffect(() => {
    if (autoStart && videoRef.current) {
      handleConnect();
    }
    return () => {
      cleanupPlayer(cameraId, onLog);
    };
  }, [autoStart, cameraId]);

  const handleConnect = () => {
    if (!videoRef.current) return;
    
    setConnectionStatus('connecting');
    setLastError('');
    onLog?.(`[VideoPlayer ${cameraId}] Starting HLS connection`);
    
    setupPlayer(cameraId, videoRef.current, onLog, handleCameraStateUpdate);
  };

  const handleDisconnect = () => {
    cleanupPlayer(cameraId, onLog);
    setIsConnected(false);
    setConnectionStatus('idle');
    setLastError('');
    onLog?.(`[VideoPlayer ${cameraId}] Disconnected`);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'HLS Connected';
      case 'connecting': return 'Connecting...';
      case 'failed': return 'Connection Failed';
      default: return 'Ready';
    }
  };

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        controls={false}
        muted
        playsInline
      />
      
      {/* Status Overlay */}
      <div className="absolute top-2 left-2 flex items-center space-x-2">
        <div className={`flex items-center space-x-1 text-xs font-medium ${getStatusColor()}`}>
          {connectionStatus === 'connecting' && <Clock className="w-3 h-3 animate-spin" />}
          {connectionStatus === 'failed' && <AlertTriangle className="w-3 h-3" />}
          <span>{getStatusText()}</span>
        </div>
        {isConnected && (
          <div className="text-xs text-yellow-400 bg-black/50 px-1 rounded">
            ~5s delay
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-2 right-2 flex space-x-1">
          {onSnapshot && isConnected && (
            <Button
              size="sm"
              onClick={handleSnapshot}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Camera className="w-3 h-3" />
            </Button>
          )}
          {!isConnected ? (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connectionStatus === 'connecting'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Square className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Error Display */}
      {lastError && connectionStatus === 'failed' && (
        <div className="absolute bottom-2 left-2 text-xs text-red-400 bg-black/75 px-2 py-1 rounded max-w-48 truncate">
          {lastError}
        </div>
      )}

      {/* No Connection Placeholder */}
      {!isConnected && connectionStatus === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
          <div className="text-center text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Camera {cameraId}</p>
            <p className="text-xs">Click to connect</p>
          </div>
        </div>
      )}
    </div>
  );
};
