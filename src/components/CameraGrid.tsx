import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Play, Square, Image, Edit2, Check, X, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Hls from 'hls.js';
import { useCameraState } from '@/hooks/useCameraState';
import { useCameraHLS } from '@/hooks/useCameraHLS';
import { CameraTile } from './CameraTile';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';
import { config } from '@/config/environment';

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
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const connectionRetryCount = useRef(0);
  const lastConnectionAttempt = useRef(0);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 10000;
  const MAX_CONNECTION_RETRIES = 5;
  const CONNECTION_RETRY_DELAY = 5000;

  const { cameraStates, updateCameraState, initializeCameraState } = useCameraState();
  const { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef } = useCameraHLS();

  // Improved WebSocket connection with rate limiting
  const connectWebSocket = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt.current;
    
    // Rate limiting: don't attempt connection too frequently
    if (timeSinceLastAttempt < CONNECTION_RETRY_DELAY && connectionRetryCount.current > 0) {
      onLog?.(`Rate limiting WebSocket connection attempt. Wait ${Math.ceil((CONNECTION_RETRY_DELAY - timeSinceLastAttempt) / 1000)}s`);
      return;
    }

    if (connectionRetryCount.current >= MAX_CONNECTION_RETRIES) {
      onLog?.(`Max WebSocket connection attempts reached (${MAX_CONNECTION_RETRIES}). Please check backend service.`);
      setConnectionState('failed');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('connecting');
    lastConnectionAttempt.current = now;
    connectionRetryCount.current++;

    const wsUrl = config.backend.wsUrl;
    onLog?.(`Attempting WebSocket connection ${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES} to ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          onLog?.(`WebSocket connection timeout after 10s`);
          setConnectionState('failed');
          scheduleReconnection();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket connected successfully to ${wsUrl}`);
        setConnectionState('connected');
        connectionRetryCount.current = 0; // Reset retry count on successful connection
        wsRef.current = ws;
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        setConnectionState('disconnected');
        wsRef.current = null;
        
        // Only attempt reconnection if not manually closed
        if (event.code !== 1000 && connectionRetryCount.current < MAX_CONNECTION_RETRIES) {
          scheduleReconnection();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket error: ${error.type} - backend server may not be running`);
        setConnectionState('failed');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          // Ignore JSON parse errors for non-JSON messages
        }
      };

    } catch (error: any) {
      onLog?.(`WebSocket connection failed: ${error.message}`);
      setConnectionState('failed');
      scheduleReconnection();
    }
  };

  const scheduleReconnection = () => {
    if (connectionRetryCount.current < MAX_CONNECTION_RETRIES) {
      const delay = CONNECTION_RETRY_DELAY * Math.pow(2, connectionRetryCount.current - 1); // Exponential backoff
      onLog?.(`Scheduling WebSocket reconnection in ${delay / 1000}s (attempt ${connectionRetryCount.current + 1}/${MAX_CONNECTION_RETRIES})`);
      
      setTimeout(() => {
        if (connectionState !== 'connected') {
          connectWebSocket();
        }
      }, delay);
    }
  };

  const handleWebSocketMessage = (data: any) => {
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
        // HLS availability will be managed by the HLS hook
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
  };

  // Load saved camera data on mount
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
  }, []);

  // Save camera data when it changes
  useEffect(() => {
    localStorage.setItem('jericho-camera-urls', JSON.stringify(cameraUrls));
  }, [cameraUrls]);

  useEffect(() => {
    localStorage.setItem('jericho-camera-names', JSON.stringify(cameraNames));
  }, [cameraNames]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => { 
      Object.values(retryTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      Object.keys(hlsInstancesRef.current).forEach(cameraId => {
        cleanupHLSPlayer(parseInt(cameraId), onLog);
      });
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

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

  const handleUrlSubmit = async (cameraId: number) => {
    if (!tempUrl.trim()) {
      setEditingCamera(null);
      return;
    }

    try {
      const url = tempUrl.trim();
      if (!url.startsWith('rtsp://') && !url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with rtsp://, http://, or https://');
      }

      onCameraUrlsChange({ ...cameraUrls, [cameraId]: url });
      setEditingCamera(null);
      setTempUrl('');
      
      if (onLog) {
        onLog(`Camera ${cameraId} configured with URL: ${url}`);
      }
      
      toast({
        title: "Camera URL Updated",
        description: `Camera ${cameraId} configured successfully`,
        duration: 3000,
      });

      setTimeout(() => {
        startStream(cameraId, url);
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: "Invalid URL",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const startStream = async (cameraId: number, url: string) => {
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

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start_stream',
        cameraId,
        rtspUrl: url,
      }));
      
      onLog?.(`Attempting to start Camera ${cameraId} stream (attempt ${cameraState.retryCount + 1}/${MAX_RETRIES})`);
    }
  };

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

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_stream',
        cameraId,
      }));
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
      {/* Connection status indicator */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' : 
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            connectionState === 'failed' ? 'bg-red-500' :
            'bg-gray-500'
          }`} />
          <span className="text-xs text-gray-400">
            Backend: {connectionState} 
            {connectionRetryCount.current > 0 && ` (${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES})`}
          </span>
        </div>
        {connectionState === 'failed' && connectionRetryCount.current >= MAX_CONNECTION_RETRIES && (
          <Button
            onClick={() => {
              connectionRetryCount.current = 0;
              connectWebSocket();
            }}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Reconnect
          </Button>
        )}
      </div>

      {!hasAnyCameras ? (
        <div className="h-full flex items-center justify-center bg-gray-800/30">
          <div className="text-center space-y-4">
            <Camera className="w-16 h-16 mx-auto text-gray-500" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to Jericho Security</h3>
              <p className="text-gray-400 mb-4">Your camera display is ready. Add cameras to get started.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={getGridClasses()}>
          {Array.from({ length: camerasToShow }, (_, i) => renderCamera(startCameraId + i))}
        </div>
      )}
    </div>
  );
};
