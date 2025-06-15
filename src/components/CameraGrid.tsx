import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Play, Square, Image, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Hls from 'hls.js';

interface CameraGridProps {
  layout: number;
  isFullscreen: boolean;
  onSnapshot: (cameraId: number) => void;
  currentPage?: number;
  onLog?: (msg: string) => void;
}

interface CameraState {
  retryCount: number;
  lastError: string;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'failed';
  lastAttempt: number;
  hlsAvailable: boolean;
}

export const CameraGrid: React.FC<CameraGridProps> = ({ layout, isFullscreen, onSnapshot, currentPage = 1, onLog }) => {
  const [cameraUrls, setCameraUrls] = useState<Record<number, string>>({});
  const [cameraNames, setCameraNames] = useState<Record<number, string>>({});
  const [activeStreams, setActiveStreams] = useState<Record<number, boolean>>({});
  const [cameraStates, setCameraStates] = useState<Record<number, CameraState>>({});
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempName, setTempName] = useState('');
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const hlsInstancesRef = useRef<Record<number, Hls>>({});

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 10000; // 10 seconds between retries

  const initializeCameraState = (cameraId: number): CameraState => ({
    retryCount: 0,
    lastError: '',
    connectionStatus: 'idle',
    lastAttempt: 0,
    hlsAvailable: false
  });

  const updateCameraState = (cameraId: number, updates: Partial<CameraState>) => {
    setCameraStates(prev => ({
      ...prev,
      [cameraId]: { ...prev[cameraId] || initializeCameraState(cameraId), ...updates }
    }));
  };

  // Check if HLS file exists
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
    // Load saved camera URLs and names
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
    // Save camera URLs whenever they change
    localStorage.setItem('jericho-camera-urls', JSON.stringify(cameraUrls));
  }, [cameraUrls]);

  useEffect(() => {
    // Save camera names whenever they change
    localStorage.setItem('jericho-camera-names', JSON.stringify(cameraNames));
  }, [cameraNames]);

  useEffect(() => {
    // Initialize WebSocket for RTSP stream control
    let ws: WebSocket;
    function connectWebSocket() {
      // Use current domain and protocol for WebSocket connection
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/`;

      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        if (onLog) onLog("WebSocket connected to backend for stream control");
      };
      ws.onclose = () => {
        if (onLog) onLog("WebSocket disconnected from backend");
        setTimeout(connectWebSocket, 5000);
      };
      ws.onerror = (e) => {
        if (onLog) onLog("WebSocket connection error - backend may not be running");
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
              // Check if HLS file is available after a short delay
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
            
            // Only auto-retry if we haven't exceeded max retries
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
      // Clear all retry timeouts
      Object.values(retryTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      // Clean up all HLS instances
      Object.keys(hlsInstancesRef.current).forEach(cameraId => {
        cleanupHLSPlayer(parseInt(cameraId));
      });
    };
    // Avoid extra effect triggers (single establish)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGridClasses = () => {
    const baseClasses = 'h-full';
    if (isFullscreen) {
      return `grid grid-cols-4 grid-rows-3 gap-1 ${baseClasses}`;
    }
    
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
      // Validate RTSP URL format
      const url = tempUrl.trim();
      if (!url.startsWith('rtsp://') && !url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with rtsp://, http://, or https://');
      }

      setCameraUrls(prev => ({ ...prev, [cameraId]: url }));
      setEditingCamera(null);
      setTempUrl('');
      
      // Reset camera state for new URL
      updateCameraState(cameraId, {
        retryCount: 0,
        lastError: '',
        connectionStatus: 'idle',
        hlsAvailable: false
      });
      
      // Clear any existing retry timeout
      if (retryTimeoutsRef.current[cameraId]) {
        clearTimeout(retryTimeoutsRef.current[cameraId]);
        delete retryTimeoutsRef.current[cameraId];
      }
      
      await startStream(cameraId, url);
      
      toast({
        title: "Camera URL Updated",
        description: `Camera ${cameraId} configured successfully`,
      });
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startStream = async (cameraId: number, url: string) => {
    const cameraState = cameraStates[cameraId] || initializeCameraState(cameraId);
    
    // Prevent starting if we're already at max retries
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
    // Clear any pending retry
    if (retryTimeoutsRef.current[cameraId]) {
      clearTimeout(retryTimeoutsRef.current[cameraId]);
      delete retryTimeoutsRef.current[cameraId];
    }

    // Clean up HLS player first
    cleanupHLSPlayer(cameraId);

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
    // Clear retry timeout
    if (retryTimeoutsRef.current[cameraId]) {
      clearTimeout(retryTimeoutsRef.current[cameraId]);
      delete retryTimeoutsRef.current[cameraId];
    }

    // Clean up HLS player
    cleanupHLSPlayer(cameraId);

    // Reset state
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

  const setupHLSPlayer = (cameraId: number, videoElement: HTMLVideoElement) => {
    if (!videoElement) {
      if (onLog) onLog(`No video element found for Camera ${cameraId}`);
      return;
    }

    // Clean up existing HLS instance
    cleanupHLSPlayer(cameraId);

    const hlsUrl = `/hls/camera_${cameraId}.m3u8`;
    
    if (onLog) onLog(`Setting up HLS player for Camera ${cameraId} with URL: ${hlsUrl}`);

    if (Hls.isSupported()) {
      if (onLog) onLog(`HLS.js is supported, creating new instance for Camera ${cameraId}`);
      
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false,
      });

      hlsInstancesRef.current[cameraId] = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (onLog) onLog(`HLS manifest parsed for Camera ${cameraId}, attempting autoplay`);
        updateCameraState(cameraId, { hlsAvailable: true });
        
        videoElement.play().then(() => {
          if (onLog) onLog(`Video playback started for Camera ${cameraId}`);
        }).catch(error => {
          if (onLog) onLog(`Autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (onLog) onLog(`HLS error for Camera ${cameraId}: ${data.type} - ${data.details} - Fatal: ${data.fatal}`);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (onLog) onLog(`Network error for Camera ${cameraId}, retrying...`);
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId]) {
                  hlsInstancesRef.current[cameraId].startLoad();
                }
              }, 1000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (onLog) onLog(`Media error for Camera ${cameraId}, trying to recover...`);
              setTimeout(() => {
                if (hlsInstancesRef.current[cameraId]) {
                  hlsInstancesRef.current[cameraId].recoverMediaError();
                }
              }, 1000);
              break;
            default:
              if (onLog) onLog(`Fatal error for Camera ${cameraId}, destroying player`);
              cleanupHLSPlayer(cameraId);
              updateCameraState(cameraId, { 
                hlsAvailable: false, 
                lastError: `HLS Fatal Error: ${data.details}` 
              });
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (onLog) onLog(`HLS fragment loaded for Camera ${cameraId}`);
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      if (onLog) onLog(`Using Safari native HLS support for Camera ${cameraId}`);
      videoElement.src = hlsUrl;
      
      videoElement.addEventListener('loadedmetadata', () => {
        if (onLog) onLog(`Safari HLS metadata loaded for Camera ${cameraId}`);
        updateCameraState(cameraId, { hlsAvailable: true });
        
        videoElement.play().then(() => {
          if (onLog) onLog(`Safari video playback started for Camera ${cameraId}`);
        }).catch(error => {
          if (onLog) onLog(`Safari autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      });
    } else {
      if (onLog) onLog(`HLS not supported for Camera ${cameraId}`);
      updateCameraState(cameraId, { 
        hlsAvailable: false, 
        lastError: 'HLS not supported by browser' 
      });
    }
  };

  const cleanupHLSPlayer = (cameraId: number) => {
    if (hlsInstancesRef.current[cameraId]) {
      if (onLog) onLog(`Cleaning up HLS player for Camera ${cameraId}`);
      hlsInstancesRef.current[cameraId].destroy();
      delete hlsInstancesRef.current[cameraId];
    }
  };

  const handleVideoError = (cameraId: number, error: any) => {
    const videoElement = videoRefs.current[cameraId];
    if (onLog) {
      onLog(`Video element error for Camera ${cameraId}: ${error.type} - Code: ${error.target?.error?.code}`);
    }
    
    updateCameraState(cameraId, {
      lastError: `Video error: ${error.target?.error?.code || 'Unknown'}`,
    });

    // Try to recover by recreating the HLS player
    if (activeStreams[cameraId] && videoElement) {
      if (onLog) onLog(`Attempting to recover video for Camera ${cameraId}`);
      setTimeout(() => {
        setupHLSPlayer(cameraId, videoElement);
      }, 2000);
    }
  };

  const handleVideoCanPlay = (cameraId: number) => {
    if (onLog) {
      onLog(`Video element can play for Camera ${cameraId}`);
    }
    updateCameraState(cameraId, {
      hlsAvailable: true,
      lastError: ''
    });
  };

  const handleMultipleCamerasSetup = (cameras: Array<{ id: number; name: string; url: string; }>) => {
    const newUrls = { ...cameraUrls };
    cameras.forEach(camera => {
      newUrls[camera.id] = camera.url;
    });
    setCameraUrls(newUrls);
    
    toast({
      title: "Multiple Cameras Added",
      description: `${cameras.length} cameras configured successfully`,
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

  const renderCamera = (cameraId: number) => {
    const isActive = activeStreams[cameraId];
    const url = cameraUrls[cameraId];
    const name = cameraNames[cameraId] || `Camera ${cameraId}`;
    const isEditing = editingCamera === cameraId;
    const isEditingName = editingName === cameraId;
    const cameraState = cameraStates[cameraId] || initializeCameraState(cameraId);

    const getStatusColor = () => {
      if (isActive && cameraState.hlsAvailable) return 'bg-green-500';
      if (isActive && !cameraState.hlsAvailable) return 'bg-orange-500';
      switch (cameraState.connectionStatus) {
        case 'connecting': return 'bg-yellow-500 animate-pulse';
        case 'failed': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };

    const getStatusText = () => {
      if (isActive && cameraState.hlsAvailable) return 'Live';
      if (isActive && !cameraState.hlsAvailable) return 'Converting...';
      switch (cameraState.connectionStatus) {
        case 'connecting': return 'Connecting...';
        case 'failed': return `Failed (${cameraState.retryCount}/${MAX_RETRIES})`;
        default: return 'Stopped';
      }
    };

    return (
      <div 
        key={cameraId}
        className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col"
      >
        {/* Camera Header */}
        <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center space-x-2 flex-1">
            <Camera className="w-4 h-4" />
            {isEditingName ? (
              <div className="flex items-center space-x-1 flex-1">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="h-6 text-xs py-1 px-2"
                  placeholder="Camera name"
                  onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit(cameraId)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNameSubmit(cameraId)}
                  className="h-6 w-6 p-0"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingName(null);
                    setTempName('');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-1">
                <span className="text-sm font-medium truncate">{name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingName(cameraId);
                    setTempName(name);
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs text-gray-400">{getStatusText()}</span>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSnapshot(cameraId)}
              disabled={!isActive}
              className="h-6 w-6 p-0"
            >
              <Image className="w-3 h-3" />
            </Button>
            {isActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => stopStream(cameraId)}
                className="h-6 w-6 p-0"
              >
                <Square className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => url && startStream(cameraId, url)}
                disabled={!url || cameraState.connectionStatus === 'connecting'}
                className="h-6 w-6 p-0"
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
            {cameraState.retryCount >= MAX_RETRIES && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetCamera(cameraId)}
                className="h-6 w-6 p-0 text-orange-400"
                title="Reset camera (exceeded max retries)"
              >
                <AlertTriangle className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative group">
          {isActive ? (
            <video
              ref={(el) => {
                videoRefs.current[cameraId] = el;
                if (el && isActive) {
                  // Small delay to ensure DOM is ready
                  setTimeout(() => {
                    setupHLSPlayer(cameraId, el);
                  }, 500);
                }
              }}
              className="w-full h-full object-cover bg-black"
              autoPlay
              muted
              playsInline
              controls={false}
              onError={(e) => handleVideoError(cameraId, e)}
              onCanPlay={() => handleVideoCanPlay(cameraId)}
              onLoadStart={() => {
                if (onLog) onLog(`Video loading started for Camera ${cameraId}`);
              }}
              onLoadedData={() => {
                if (onLog) onLog(`Video data loaded for Camera ${cameraId}`);
              }}
              onWaiting={() => {
                if (onLog) onLog(`Video waiting for data for Camera ${cameraId}`);
              }}
              onPlaying={() => {
                if (onLog) onLog(`Video playing for Camera ${cameraId}`);
              }}
            >
              Your browser does not support HLS video playback.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">
                  {cameraState.connectionStatus === 'failed' && cameraState.lastError ? 
                    `Error: ${cameraState.lastError}` :
                    url ? `Stream ${cameraState.connectionStatus}` : 'No URL Set'
                  }
                </p>
                {cameraState.retryCount >= MAX_RETRIES && (
                  <p className="text-xs text-orange-400 mt-1">
                    Max retries reached. Click ⚠️ to reset.
                  </p>
                )}
                {isActive && !cameraState.hlsAvailable && (
                  <p className="text-xs text-yellow-400 mt-1">
                    FFmpeg processing RTSP stream...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* URL Input */}
        <div className="p-2 bg-gray-900 border-t border-gray-700">
          {isEditing ? (
            <div className="flex space-x-2">
              <Input
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="rtsp://username:password@ip:port/path"
                className="text-xs"
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit(cameraId)}
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => handleUrlSubmit(cameraId)}
                className="px-2"
              >
                Save
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingCamera(cameraId);
                setTempUrl(url || '');
              }}
              className="w-full text-left text-xs text-gray-400 hover:text-white truncate"
            >
              {url || 'Click to set RTSP URL'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const effectiveLayout = isFullscreen ? 12 : layout;
  const camerasToShow = effectiveLayout;
  const startCameraId = (currentPage - 1) * effectiveLayout + 1;

  return (
    <div className={getGridClasses()}>
      {Array.from({ length: camerasToShow }, (_, i) => renderCamera(startCameraId + i))}
    </div>
  );
};
