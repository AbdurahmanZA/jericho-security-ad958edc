import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Play, Square, Image, Edit2, Check, X, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Hls from 'hls.js';
import { useCameraState } from '@/hooks/useCameraState';
import { useCameraHLS } from '@/hooks/useCameraHLS';
import { CameraTile } from './CameraTile';
import { SaveLayoutButton } from './SaveLayoutButton';
import { ComprehensiveCameraSetup } from './ComprehensiveCameraSetup';
import { UniversalVideoPlayer } from './UniversalVideoPlayer';

interface CameraGridProps {
  layout: number;
  isFullscreen: boolean;
  onSnapshot: (cameraId: number) => void;
  currentPage?: number;
  onLog?: (msg: string) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({ layout, isFullscreen, onSnapshot, currentPage = 1, onLog }) => {
  const [cameraUrls, setCameraUrls] = useState<Record<number, string>>({});
  const [cameraNames, setCameraNames] = useState<Record<number, string>>({});
  const [activeStreams, setActiveStreams] = useState<Record<number, boolean>>({});
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempName, setTempName] = useState('');
  const [showCameraSetup, setShowCameraSetup] = useState(false);
  const [useUniversalPlayer, setUseUniversalPlayer] = useState(true);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 10000;

  const { cameraStates, updateCameraState, initializeCameraState } = useCameraState();
  const { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef } = useCameraHLS();

  const checkHLSAvailability = async (cameraId: number) => {
    try {
      const response = await fetch(`/hls/camera_${cameraId}.m3u8`, { method: 'HEAD' });
      const isAvailable = response.ok;
      updateCameraState(cameraId, { hlsAvailable: isAvailable });
      if (onLog) {
        onLog(`HLS file for Camera ${cameraId}: ${isAvailable ? 'Available' : 'Not found'}`);
      }
      return isAvailable;
    } catch (error) {
      updateCameraState(cameraId, { hlsAvailable: false });
      if (onLog) {
        onLog(`HLS check failed for Camera ${cameraId}: ${error.message}`);
      }
      return false;
    }
  };

  useEffect(() => {
    const savedUrls = localStorage.getItem('jericho-camera-urls');
    const savedNames = localStorage.getItem('jericho-camera-names');
    if (savedUrls) {
      setCameraUrls(JSON.parse(savedUrls));
    }
    if (savedNames) {
      setCameraNames(JSON.parse(savedNames));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('jericho-camera-urls', JSON.stringify(cameraUrls));
  }, [cameraUrls]);

  useEffect(() => {
    localStorage.setItem('jericho-camera-names', JSON.stringify(cameraNames));
  }, [cameraNames]);

  useEffect(() => {
    let ws: WebSocket;
    function connectWebSocket() {
      // Use the correct WebSocket URL for your backend
      const wsUrl = `wss://192.168.0.138/ws`;

      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        if (onLog) onLog("WebSocket connected to backend for stream control");
      };
      ws.onclose = () => {
        if (onLog) onLog("WebSocket disconnected from backend");
        setTimeout(connectWebSocket, 5000);
      };
      ws.onerror = (e) => {
        if (onLog) onLog("WebSocket connection error - backend server may not be running");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
              if (onLog) onLog(`Camera ${data.cameraId} stream started successfully`);
              setTimeout(() => checkHLSAvailability(data.cameraId), 3000);
            } else {
              updateCameraState(data.cameraId, {
                connectionStatus: 'idle',
                hlsAvailable: false
              });
              if (onLog) onLog(`Camera ${data.cameraId} stream stopped`);
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
            
            if (onLog) onLog(`Camera ${data.cameraId} stream error: ${data.error} (attempt ${cameraState.retryCount + 1}/${MAX_RETRIES})`);
            
            if (cameraState.retryCount < MAX_RETRIES) {
              const url = cameraUrls[data.cameraId];
              if (url) {
                if (onLog) onLog(`Will retry Camera ${data.cameraId} in ${RETRY_DELAY/1000} seconds`);
                retryTimeoutsRef.current[data.cameraId] = setTimeout(() => {
                  startStream(data.cameraId, url);
                }, RETRY_DELAY);
              }
            } else {
              if (onLog) onLog(`Camera ${data.cameraId} exceeded max retries (${MAX_RETRIES}). Manual restart required.`);
            }
          }
        } catch {}
      };
      wsRef.current = ws;
    }
    connectWebSocket();
    return () => { 
      ws && ws.close();
      Object.values(retryTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      Object.keys(hlsInstancesRef.current).forEach(cameraId => {
        cleanupHLSPlayer(parseInt(cameraId), onLog);
      });
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

      setCameraUrls(prev => ({ ...prev, [cameraId]: url }));
      setEditingCamera(null);
      setTempUrl('');
      
      // Activate the stream
      setActiveStreams(prev => ({ ...prev, [cameraId]: true }));
      
      if (onLog) {
        onLog(`Camera ${cameraId} configured with URL: ${url}`);
      }
      
      toast({
        title: "Camera URL Updated",
        description: `Camera ${cameraId} configured successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Invalid URL",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startStream = async (cameraId: number, url: string) => {
    const cameraState = cameraStates[cameraId] || initializeCameraState(cameraId);
    
    if (cameraState.retryCount >= MAX_RETRIES) {
      if (onLog) onLog(`Camera ${cameraId} has exceeded max retries. Reset required.`);
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
      
      if (onLog) onLog(`Attempting to start Camera ${cameraId} stream (attempt ${cameraState.retryCount + 1}/${MAX_RETRIES})`);
    } else {
      updateCameraState(cameraId, {
        connectionStatus: 'failed',
        lastError: 'Backend WebSocket not connected'
      });
      if (onLog) onLog(`Cannot start Camera ${cameraId} - backend WebSocket not connected`);
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
      if (onLog) onLog(`Stopped Camera ${cameraId} stream`);
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
    
    if (onLog) onLog(`Reset Camera ${cameraId} - ready for manual restart`);
    
    toast({
      title: "Camera Reset",
      description: `Camera ${cameraId} has been reset and can be restarted manually`,
    });
  };

  const handleNameSubmit = (cameraId: number) => {
    if (tempName.trim()) {
      setCameraNames(prev => ({ ...prev, [cameraId]: tempName.trim() }));
      toast({
        title: "Camera Renamed",
        description: `Camera ${cameraId} renamed to "${tempName.trim()}"`,
      });
    }
    setEditingName(null);
    setTempName('');
  };

  const handleAddCameras = (cameras: Array<{ id: number; name: string; url: string; }>) => {
    const newUrls = { ...cameraUrls };
    const newNames = { ...cameraNames };
    const newActiveStreams = { ...activeStreams };
    
    cameras.forEach(camera => {
      newUrls[camera.id] = camera.url;
      newNames[camera.id] = camera.name;
      newActiveStreams[camera.id] = true;
    });
    
    setCameraUrls(newUrls);
    setCameraNames(newNames);
    setActiveStreams(newActiveStreams);
    
    if (onLog) {
      onLog(`Added ${cameras.length} cameras from comprehensive setup`);
    }
  };

  const toggleStream = (cameraId: number) => {
    setActiveStreams(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }));
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
          
          {/* Camera controls overlay */}
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

          {/* Camera name */}
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs text-white">
            {name}
          </div>
        </div>
      );
    }

    // Fallback to original tile-based approach
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
    <div className="h-full flex flex-col">
      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white">Camera Display</h2>
          <span className="text-sm text-gray-400">
            Page {currentPage} • {layout} cameras
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseUniversalPlayer(!useUniversalPlayer)}
            className={useUniversalPlayer ? "bg-green-600 text-white" : ""}
          >
            {useUniversalPlayer ? 'Universal Player' : 'Legacy Player'}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCameraSetup(true)}
            className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Cameras
          </Button>
          
          <SaveLayoutButton
            layout={layout}
            currentPage={currentPage}
            cameraUrls={cameraUrls}
            cameraNames={cameraNames}
          />
        </div>
      </div>

      {/* Camera Grid */}
      <div className="flex-1">
        {!hasAnyCameras ? (
          <div className="h-full flex items-center justify-center bg-gray-800/30">
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-gray-500" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to Jericho Security</h3>
                <p className="text-gray-400 mb-4">Your camera display is ready. Add cameras to get started.</p>
                <Button
                  onClick={() => setShowCameraSetup(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Camera
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={getGridClasses()}>
            {Array.from({ length: camerasToShow }, (_, i) => renderCamera(startCameraId + i))}
          </div>
        )}
      </div>

      <ComprehensiveCameraSetup
        open={showCameraSetup}
        onClose={() => setShowCameraSetup(false)}
        onAddCameras={handleAddCameras}
        existingCameras={cameraUrls}
      />
    </div>
  );
};
