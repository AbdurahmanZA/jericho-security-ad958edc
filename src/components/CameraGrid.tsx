import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Play, Square, Image, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCameraState } from '@/hooks/useCameraState';
import { useCameraHLS } from '@/hooks/useCameraHLS';
import { useWebSocketManager } from '@/hooks/useWebSocketManager';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { EmptyCameraGrid } from './EmptyCameraGrid';

interface CameraGridProps {
  layout: number;
  isFullscreen: boolean;
  onSnapshot: (cameraId: number) => void;
  currentPage?: number;
  onLog?: (msg: string) => void;
  cameraUrls: Record<number, string>;
  cameraNames: Record<number, string>;
  onCameraUrlsChange: (urls: Record<number, string>) => void;
  onCameraNamesChange: (names: Record<number, string>) => void;
  useUniversalPlayer: boolean;
}

export const CameraGrid: React.FC<CameraGridProps> = ({ 
  layout, 
  isFullscreen, 
  onSnapshot, 
  currentPage = 1, 
  onLog,
  cameraUrls,
  cameraNames,
  onCameraUrlsChange,
  onCameraNamesChange,
  useUniversalPlayer
}) => {
  const [activeStreams, setActiveStreams] = useState<Record<number, boolean>>({});
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempName, setTempName] = useState('');
  const { toast } = useToast();
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 10000;

  const { cameraStates, updateCameraState, initializeCameraState } = useCameraState();
  const { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef } = useCameraHLS();

  // WebSocket message handler - memoized to prevent recreation
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === "stream_status" && typeof data.cameraId !== "undefined") {
      const isStarted = data.status === "started";
      setActiveStreams((prev) => ({
        ...prev,
        [data.cameraId]: isStarted
      }));
      
      if (isStarted) {
        updateCameraState(data.cameraId, {
          connectionStatus: 'connected',
          retryCount: 0,
          lastError: ''
        });
        onLog?.(`Camera ${data.cameraId} stream started successfully`);
      } else {
        updateCameraState(data.cameraId, {
          connectionStatus: 'idle',
          hlsAvailable: false
        });
        onLog?.(`Camera ${data.cameraId} stream stopped`);
      }
    }
    
    if (data.type === "stream_error" && typeof data.cameraId !== "undefined") {
      const cameraState = cameraStates[data.cameraId] || initializeCameraState(data.cameraId);
      
      setActiveStreams((prev) => ({
        ...prev,
        [data.cameraId]: false
      }));
      
      updateCameraState(data.cameraId, {
        connectionStatus: 'failed',
        lastError: data.error,
        retryCount: cameraState.retryCount + 1,
        hlsAvailable: false
      });
      
      onLog?.(`Camera ${data.cameraId} stream error: ${data.error} (attempt ${cameraState.retryCount + 1}/${MAX_RETRIES})`);
      
      if (cameraState.retryCount < MAX_RETRIES) {
        const url = cameraUrls[data.cameraId];
        if (url) {
          onLog?.(`Will retry Camera ${data.cameraId} in ${RETRY_DELAY/1000} seconds`);
          retryTimeoutsRef.current[data.cameraId] = setTimeout(() => {
            startStream(data.cameraId, url);
          }, RETRY_DELAY);
        }
      } else {
        onLog?.(`Camera ${data.cameraId} exceeded max retries (${MAX_RETRIES}). Manual restart required.`);
      }
    }
  }, [cameraStates, initializeCameraState, updateCameraState, onLog, cameraUrls, MAX_RETRIES, RETRY_DELAY]);

  const { connectionState, connectionRetryCount, maxConnectionRetries, sendMessage, resetConnection } = useWebSocketManager({
    onLog,
    onMessage: handleWebSocketMessage
  });

  // Load saved camera data on mount - only once
  useEffect(() => {
    const savedUrls = localStorage.getItem('jericho-camera-urls');
    const savedNames = localStorage.getItem('jericho-camera-names');
    if (savedUrls) {
      try {
        const urls = JSON.parse(savedUrls);
        onCameraUrlsChange(urls);
      } catch (error) {
        console.error('Error parsing saved URLs:', error);
      }
    }
    if (savedNames) {
      try {
        const names = JSON.parse(savedNames);
        onCameraNamesChange(names);
      } catch (error) {
        console.error('Error parsing saved names:', error);
      }
    }
  }, []); // Empty dependency array - only run once

  // Save camera data when it changes
  useEffect(() => {
    localStorage.setItem('jericho-camera-urls', JSON.stringify(cameraUrls));
  }, [cameraUrls]);

  useEffect(() => {
    localStorage.setItem('jericho-camera-names', JSON.stringify(cameraNames));
  }, [cameraNames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { 
      Object.values(retryTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      Object.keys(hlsInstancesRef.current).forEach(cameraId => {
        cleanupHLSPlayer(parseInt(cameraId), onLog);
      });
    };
  }, [cleanupHLSPlayer, onLog, hlsInstancesRef]);

  const getGridClasses = () => {
    const baseClasses = 'h-full';
    
    switch (layout) {
      case 1:
        return `grid grid-cols-1 gap-4 ${baseClasses}`;
      case 2:
        return `grid grid-cols-2 gap-4 ${baseClasses}`;
      case 4:
        return `grid grid-cols-2 grid-rows-2 gap-4 ${baseClasses}`;
      case 6:
        return `grid grid-cols-3 grid-rows-2 gap-3 ${baseClasses}`;
      case 9:
        return `grid grid-cols-3 grid-rows-3 gap-3 ${baseClasses}`;
      case 12:
        return `grid grid-cols-4 grid-rows-3 gap-2 ${baseClasses}`;
      default:
        return `grid grid-cols-2 grid-rows-2 gap-4 ${baseClasses}`;
    }
  };

  const startStream = useCallback(async (cameraId: number, url: string) => {
    const cameraState = cameraStates[cameraId] || initializeCameraState(cameraId);
    
    if (cameraState.retryCount >= MAX_RETRIES) {
      onLog?.(`Camera ${cameraId} has exceeded max retries. Reset required.`);
      return;
    }

    if (connectionState !== 'connected') {
      onLog?.(`Cannot start Camera ${cameraId} - WebSocket not connected (${connectionState})`);
      return;
    }

    updateCameraState(cameraId, {
      connectionStatus: 'connecting',
      lastAttempt: Date.now(),
      hlsAvailable: false
    });

    const success = sendMessage({
      type: 'start_stream',
      cameraId,
      rtspUrl: url,
    });
    
    if (success) {
      onLog?.(`Attempting to start Camera ${cameraId} stream (attempt ${cameraState.retryCount + 1}/${MAX_RETRIES})`);
    }
  }, [cameraStates, initializeCameraState, updateCameraState, connectionState, sendMessage, onLog, MAX_RETRIES]);

  const stopStream = async (cameraId: number) => {
    if (retryTimeoutsRef.current[cameraId]) {
      clearTimeout(retryTimeoutsRef.current[cameraId]);
      delete retryTimeoutsRef.current[cameraId];
    }

    cleanupHLSPlayer(cameraId, onLog);

    updateCameraState(cameraId, {
      connectionStatus: 'idle',
      retryCount: 0,
      lastError: '',
      hlsAvailable: false
    });

    const success = sendMessage({
      type: 'stop_stream',
      cameraId,
    });
    
    if (success) {
      setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
      onLog?.(`Stopped Camera ${cameraId} stream`);
    }
  };

  const resetCamera = (cameraId: number) => {
    if (retryTimeoutsRef.current[cameraId]) {
      clearTimeout(retryTimeoutsRef.current[cameraId]);
      delete retryTimeoutsRef.current[cameraId];
    }

    cleanupHLSPlayer(cameraId, onLog);

    updateCameraState(cameraId, {
      retryCount: 0,
      lastError: '',
      connectionStatus: 'idle',
      hlsAvailable: false
    });

    setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
    
    onLog?.(`Reset Camera ${cameraId} - ready for manual restart`);
    
    toast({
      title: "Camera Reset",
      description: `Camera ${cameraId} has been reset and can be restarted manually`,
      duration: 3000,
    });
  };

  const handleNameSubmit = (cameraId: number) => {
    if (tempName.trim()) {
      onCameraNamesChange({ ...cameraNames, [cameraId]: tempName.trim() });
      toast({
        title: "Camera Renamed",
        description: `Camera ${cameraId} renamed to "${tempName.trim()}"`,
        duration: 3000,
      });
    }
    setEditingName(null);
    setTempName('');
  };

  const toggleStream = (cameraId: number) => {
    const url = cameraUrls[cameraId];
    const isCurrentlyActive = activeStreams[cameraId];
    
    if (isCurrentlyActive) {
      stopStream(cameraId);
    } else if (url) {
      startStream(cameraId, url);
    }
  };

  // HLS player setup effect - memoized dependencies
  useEffect(() => {
    const cameraIds = Array.from({ length: isFullscreen ? 12 : layout }, (_, i) =>
      ((currentPage - 1) * (isFullscreen ? 12 : layout)) + 1 + i
    );

    cameraIds.forEach((cameraId) => {
      const isActive = activeStreams[cameraId];
      const videoEl = videoRefs.current[cameraId];
      
      if (isActive && videoEl && !hlsInstancesRef.current[cameraId]) {
        setupHLSPlayer(cameraId, videoEl, onLog, updateCameraState);
      }
      if ((!isActive || !videoEl) && hlsInstancesRef.current[cameraId]) {
        cleanupHLSPlayer(cameraId, onLog);
      }
    });

    return () => {
      cameraIds.forEach((cameraId) => {
        cleanupHLSPlayer(cameraId, onLog);
      });
    };
  }, [activeStreams, layout, isFullscreen, currentPage, setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef, onLog, updateCameraState]);

  const renderCamera = (cameraId: number) => {
    const url = cameraUrls[cameraId];
    const name = cameraNames[cameraId] || `Camera ${cameraId}`;
    const isActive = activeStreams[cameraId] && !!url;

    if (useUniversalPlayer && url) {
      return (
        <div key={cameraId} className="relative bg-black rounded-lg overflow-hidden">
          <UniversalVideoPlayer
            cameraId={cameraId}
            rtspUrl={url}
            name={name}
            isActive={isActive}
            onLog={onLog}
            className="w-full h-full"
          />
          
          <div className="absolute bottom-2 left-2 flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStream(cameraId)}
              className="bg-black bg-opacity-70 text-white hover:bg-opacity-90"
            >
              {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSnapshot(cameraId)}
              className="bg-black bg-opacity-70 text-white hover:bg-opacity-90"
            >
              <Image className="w-4 h-4" />
            </Button>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs text-white">
            {name}
          </div>
        </div>
      );
    }

    return (
      <div key={cameraId} className="relative bg-gray-800 rounded-lg p-4 flex flex-col items-center justify-center min-h-[200px]">
        {editingCamera === cameraId ? (
          <div className="w-full space-y-3">
            <Input
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="rtsp://username:password@192.168.1.100:554/stream1"
              className="text-sm"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUrlSubmit(cameraId);
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => handleUrlSubmit(cameraId)}
                size="sm"
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditingCamera(null);
                  setTempUrl('');
                }}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Camera className="w-12 h-12 mx-auto text-gray-400" />
            
            {editingName === cameraId ? (
              <div className="space-y-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="text-center text-sm"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSubmit(cameraId);
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleNameSubmit(cameraId)}
                    size="sm"
                    className="flex-1"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingName(null);
                      setTempName('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => {
                  setEditingName(cameraId);
                  setTempName(name);
                }}
              >
                <h3 className="font-semibold text-white">{name}</h3>
                <Edit2 className="w-3 h-3 mx-auto mt-1 text-gray-500" />
              </div>
            )}
            
            {url ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 truncate max-w-full">{url}</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => toggleStream(cameraId)}
                    size="sm"
                    variant={isActive ? "destructive" : "default"}
                    className="flex-1"
                    disabled={connectionState !== 'connected'}
                  >
                    {isActive ? <Square className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {isActive ? 'Stop' : 'Start'}
                  </Button>
                  <Button
                    onClick={() => onSnapshot(cameraId)}
                    size="sm"
                    variant="outline"
                    disabled={!isActive}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setEditingCamera(cameraId);
                  setTempUrl('');
                }}
                size="sm"
                variant="outline"
                className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
              >
                Configure URL
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const effectiveLayout = layout;
  const camerasToShow = effectiveLayout;
  const startCameraId = (currentPage - 1) * effectiveLayout + 1;

  // Check if grid is empty (no cameras configured)
  const hasAnyCameras = Object.keys(cameraUrls).length > 0;

  return (
    <div className="h-full">
      <ConnectionStatusIndicator
        connectionState={connectionState}
        connectionRetryCount={connectionRetryCount}
        maxConnectionRetries={maxConnectionRetries}
        onReconnect={resetConnection}
      />

      {!hasAnyCameras ? (
        <EmptyCameraGrid />
      ) : (
        <div className={getGridClasses()}>
          {Array.from({ length: camerasToShow }, (_, i) => renderCamera(startCameraId + i))}
        </div>
      )}
    </div>
  );
};
