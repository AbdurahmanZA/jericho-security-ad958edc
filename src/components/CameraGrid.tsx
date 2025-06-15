import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Play, Square, Image, Edit2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraGridProps {
  layout: number;
  isFullscreen: boolean;
  onSnapshot: (cameraId: number) => void;
  currentPage?: number;
}

export const CameraGrid: React.FC<CameraGridProps> = ({ layout, isFullscreen, onSnapshot, currentPage = 1 }) => {
  const [cameraUrls, setCameraUrls] = useState<Record<number, string>>({});
  const [cameraNames, setCameraNames] = useState<Record<number, string>>({});
  const [activeStreams, setActiveStreams] = useState<Record<number, boolean>>({});
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<number | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [tempName, setTempName] = useState('');
  const { toast } = useToast();

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

  const getGridClasses = () => {
    if (isFullscreen) {
      return 'grid grid-cols-4 grid-rows-3 gap-1 h-[calc(100vh-8rem)]';
    }
    
    switch (layout) {
      case 1:
        return 'grid grid-cols-1 gap-4 h-[calc(100vh-8rem)]';
      case 2:
        return 'grid grid-cols-2 gap-4 h-[calc(100vh-8rem)]';
      case 4:
        return 'grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-8rem)]';
      case 6:
        return 'grid grid-cols-3 grid-rows-2 gap-3 h-[calc(100vh-8rem)]';
      case 9:
        return 'grid grid-cols-3 grid-rows-3 gap-3 h-[calc(100vh-8rem)]';
      case 12:
        return 'grid grid-cols-4 grid-rows-3 gap-2 h-[calc(100vh-8rem)]';
      default:
        return 'grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-8rem)]';
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
      
      // Start the stream
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
    try {
      const response = await fetch('/api/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraId, url })
      });

      if (response.ok) {
        setActiveStreams(prev => ({ ...prev, [cameraId]: true }));
      } else {
        throw new Error('Failed to start stream');
      }
    } catch (error) {
      console.error('Stream start error:', error);
      toast({
        title: "Stream Error",
        description: `Failed to start Camera ${cameraId}`,
        variant: "destructive",
      });
    }
  };

  const stopStream = async (cameraId: number) => {
    try {
      const response = await fetch(`/api/stream/stop/${cameraId}`, { method: 'POST' });
      if (response.ok) {
        setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
      }
    } catch (error) {
      console.error('Stream stop error:', error);
    }
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
            {isActive && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Live" />
            )}
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
                disabled={!url}
                className="h-6 w-6 p-0"
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative group">
          {isActive ? (
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              src={`/hls/camera${cameraId}/stream.m3u8`}
              onError={() => {
                console.error(`Video error for camera ${cameraId}`);
                setActiveStreams(prev => ({ ...prev, [cameraId]: false }));
              }}
            >
              <source src={`/hls/camera${cameraId}/stream.m3u8`} type="application/x-mpegURL" />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">
                  {url ? 'Stream Stopped' : 'No URL Set'}
                </p>
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

  const camerasToShow = isFullscreen ? 12 : layout;
  const startCameraId = isFullscreen ? 1 : (currentPage - 1) * layout + 1;

  return (
    <div className={getGridClasses()}>
      {Array.from({ length: camerasToShow }, (_, i) => renderCamera(startCameraId + i))}
    </div>
  );
};
