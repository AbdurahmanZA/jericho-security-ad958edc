import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCameraState } from '@/hooks/useCameraState';
import { useStreamingPlayer } from '@/hooks/useStreamingPlayer';
import { CameraTile } from './CameraTile';
import { SaveLayoutButton } from './SaveLayoutButton';
import { ComprehensiveCameraSetup } from './ComprehensiveCameraSetup';
import { ClearConnectionsButton } from './ClearConnectionsButton';

interface CameraGridProps {
  layout: number;
  isFullscreen: boolean;
  onSnapshot: (cameraId: number) => void;
  currentPage?: number;
  onLog?: (msg: string) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({ 
  layout, 
  isFullscreen, 
  onSnapshot, 
  currentPage = 1, 
  onLog 
}) => {
  const [cameraUrls, setCameraUrls] = useState<Record<number, string>>({});
  const [cameraNames, setCameraNames] = useState<Record<number, string>>({});
  const [activeStreams, setActiveStreams] = useState<Record<number, boolean>>({});
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempName, setTempName] = useState('');
  const [showCameraSetup, setShowCameraSetup] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const { cameraStates, updateCameraState, initializeCameraState } = useCameraState();
  const { setupPlayer, cleanupPlayer, hlsInstancesRef } = useStreamingPlayer();

  const getGridClasses = () => {
    const baseClasses = 'h-full';
    
    switch (layout) {
      case 1: return `grid grid-cols-1 gap-4 ${baseClasses}`;
      case 2: return `grid grid-cols-2 gap-4 ${baseClasses}`;
      case 4: return `grid grid-cols-2 grid-rows-2 gap-4 ${baseClasses}`;
      case 6: return `grid grid-cols-3 grid-rows-2 gap-3 ${baseClasses}`;
      case 9: return `grid grid-cols-3 grid-rows-3 gap-3 ${baseClasses}`;
      case 12: return `grid grid-cols-4 grid-rows-3 gap-2 ${baseClasses}`;
      default: return `grid grid-cols-2 grid-rows-2 gap-4 ${baseClasses}`;
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
      
      await startStream(cameraId, url);
      
      toast({
        title: "Camera URL Updated",
        description: `Camera ${cameraId} configured for HLS streaming`,
      });
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: error instanceof Error ? error.message : "Invalid URL format",
        variant: "destructive",
      });
    }
  };

  const startStream = async (cameraId: number, url: string) => {
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
      
      if (onLog) onLog(`Starting HLS stream for Camera ${cameraId}`);
    } else {
      updateCameraState(cameraId, {
        connectionStatus: 'failed',
        lastError: 'Backend not connected'
      });
    }
  };

  const stopStream = async (cameraId: number) => {
    cleanupPlayer(cameraId, onLog);
    
    updateCameraState(cameraId, {
      connectionStatus: 'idle',
      hlsAvailable: false
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_stream',
        cameraId,
      }));
      setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
    }
  };

  const resetCamera = (cameraId: number) => {
    cleanupPlayer(cameraId, onLog);
    updateCameraState(cameraId, {
      retryCount: 0,
      lastError: '',
      connectionStatus: 'idle',
      hlsAvailable: false
    });
    setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
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
    
    cameras.forEach(camera => {
      newUrls[camera.id] = camera.url;
      newNames[camera.id] = camera.name;
    });
    
    setCameraUrls(newUrls);
    setCameraNames(newNames);
    
    if (onLog) {
      onLog(`Added ${cameras.length} cameras for HLS streaming`);
    }
  };

  const clearAllConnections = () => {
    // Stop all active streams
    Object.keys(activeStreams).forEach(cameraIdStr => {
      const cameraId = parseInt(cameraIdStr);
      if (activeStreams[cameraId]) {
        stopStream(cameraId);
      }
    });
    
    // Clear all HLS instances
    Object.keys(hlsInstancesRef.current).forEach(cameraIdStr => {
      const cameraId = parseInt(cameraIdStr);
      cleanupPlayer(cameraId, onLog);
    });
    
    onLog?.("All camera connections cleared");
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
      const wsUrl = `wss://192.168.0.138/api/ws`;
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        if (onLog) onLog("Connected to backend for stream control");
      };
      
      ws.onclose = () => {
        if (onLog) onLog("Backend connection lost, reconnecting...");
        setTimeout(connectWebSocket, 5000);
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
            
            if (onLog) {
              onLog(`Camera ${data.cameraId} backend stream ${isStarted ? 'started' : 'stopped'}`);
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
    };
  }, []);

  useEffect(() => {
    const cameraIds = Array.from({ length: isFullscreen ? 12 : layout }, (_, i) =>
      ((currentPage - 1) * (isFullscreen ? 12 : layout)) + 1 + i
    );

    cameraIds.forEach((cameraId) => {
      const isActive = activeStreams[cameraId];
      const videoEl = videoRefs.current[cameraId];
      
      if (isActive && videoEl && !hlsInstancesRef.current[cameraId]) {
        // Delay slightly to allow backend to generate HLS files
        setTimeout(() => {
          setupPlayer(cameraId, videoEl, onLog, updateCameraState);
        }, 2000);
      }
      if (!isActive && hlsInstancesRef.current[cameraId]) {
        cleanupPlayer(cameraId, onLog);
      }
    });

    return () => {
      cameraIds.forEach((cameraId) => {
        cleanupPlayer(cameraId, onLog);
      });
    };
  }, [activeStreams, layout, isFullscreen, currentPage]);

  const renderCamera = (cameraId: number) => {
    return (
      <CameraTile
        key={cameraId}
        cameraId={cameraId}
        url={cameraUrls[cameraId]}
        name={cameraNames[cameraId] || `Camera ${cameraId}`}
        isActive={activeStreams[cameraId]}
        isEditing={editingCamera === cameraId}
        isEditingName={editingName === cameraId}
        cameraState={cameraStates[cameraId] || initializeCameraState(cameraId)}
        tempUrl={tempUrl}
        tempName={tempName}
        setEditingCamera={setEditingCamera}
        setEditingName={setEditingName}
        setTempUrl={setTempUrl}
        setTempName={setTempName}
        handleUrlSubmit={handleUrlSubmit}
        handleNameSubmit={handleNameSubmit}
        onSnapshot={onSnapshot}
        startStream={startStream}
        stopStream={stopStream}
        resetCamera={resetCamera}
        MAX_RETRIES={3}
        onLog={onLog}
        videoRefs={videoRefs}
        updateCameraState={updateCameraState}
      />
    );
  };

  const effectiveLayout = layout;
  const camerasToShow = effectiveLayout;
  const startCameraId = (currentPage - 1) * effectiveLayout + 1;
  const hasAnyCameras = Object.keys(cameraUrls).length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white">HLS Camera Display</h2>
          <span className="text-sm text-gray-400">
            Page {currentPage} • {layout} cameras • ~5s delay
          </span>
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
          
          <ClearConnectionsButton onClearAll={clearAllConnections} />
        </div>
      </div>

      {/* Camera Grid */}
      <div className="flex-1">
        {!hasAnyCameras ? (
          <div className="h-full flex items-center justify-center bg-gray-800/30">
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-gray-500" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">HLS Streaming Ready</h3>
                <p className="text-gray-400 mb-4">Optimized for multiple camera streams with ~5s latency</p>
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
