
import React, { useState, useEffect, useRef } from 'react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarTrigger,
  SidebarInset 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Camera, Settings, Image, Monitor, Video, Bell } from 'lucide-react';
import { CameraGrid } from '@/components/CameraGrid';
import { MotionLog } from '@/components/MotionLog';
import { SnapshotGallery } from '@/components/SnapshotGallery';
import { HikvisionSetup } from '@/components/HikvisionSetup';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [layout, setLayout] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHikvisionSetup, setShowHikvisionSetup] = useState(false);
  const [motionEvents, setMotionEvents] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    uptime: '00:00:00',
    activeStreams: 0,
    totalEvents: 0,
    hikvisionConnections: 0
  });
  const wsRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize WebSocket connection
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:3001');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          toast({
            title: "System Connected",
            description: "Real-time monitoring active",
          });
        };
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'motion') {
            setMotionEvents(prev => [data, ...prev.slice(0, 14)]);
            setSystemStatus(prev => ({ ...prev, totalEvents: prev.totalEvents + 1 }));
            
            toast({
              title: "Motion Detected",
              description: `Camera ${data.camera} - ${data.severity} alert`,
              variant: data.severity === 'high' ? 'destructive' : 'default',
            });
          } else if (data.type === 'status') {
            setSystemStatus(data.status);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected, attempting to reconnect...');
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    // Load saved configuration
    const savedConfig = localStorage.getItem('jericho-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setLayout(config.layout || 4);
      setIsFullscreen(config.fullscreen || false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  // Save configuration whenever layout or fullscreen changes
  useEffect(() => {
    const config = {
      layout,
      fullscreen: isFullscreen,
      timestamp: Date.now()
    };
    localStorage.setItem('jericho-config', JSON.stringify(config));
  }, [layout, isFullscreen]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setLayout(12); // Show all cameras in fullscreen
    }
  };

  const captureSnapshot = async (cameraId) => {
    try {
      const response = await fetch(`/api/snapshot/${cameraId}`, { method: 'POST' });
      if (response.ok) {
        toast({
          title: "Snapshot Captured",
          description: `Camera ${cameraId} image saved`,
        });
      } else {
        throw new Error('Failed to capture snapshot');
      }
    } catch (error) {
      toast({
        title: "Snapshot Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-gray-700">
            <SidebarHeader className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">JERICHO</h1>
                  <p className="text-xs text-gray-400">Security System</p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-4">
              {/* System Status */}
              <div className="mb-6 p-3 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold mb-2 text-gray-300">System Status</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="text-green-400">{systemStatus.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Streams:</span>
                    <span className="text-blue-400">{systemStatus.activeStreams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Motion Events:</span>
                    <span className="text-yellow-400">{systemStatus.totalEvents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hikvision:</span>
                    <span className="text-purple-400">{systemStatus.hikvisionConnections}</span>
                  </div>
                </div>
              </div>

              {/* Layout Controls */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 text-gray-300">Camera Layout</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4, 6, 9, 12].map((num) => (
                    <Button
                      key={num}
                      variant={layout === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLayoutChange(num)}
                      className="text-xs"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={isFullscreen ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFullscreen}
                  className="w-full mt-2 text-xs"
                >
                  <Monitor className="w-3 h-3 mr-1" />
                  4x3 View
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3 text-gray-300">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSnapshots(true)}
                    className="w-full justify-start text-xs"
                  >
                    <Image className="w-3 h-3 mr-2" />
                    View Snapshots
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHikvisionSetup(true)}
                    className="w-full justify-start text-xs"
                  >
                    <Settings className="w-3 h-3 mr-2" />
                    Hikvision Setup
                  </Button>
                </div>
              </div>

              {/* Motion Log */}
              <MotionLog events={motionEvents} />
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-gray-700 bg-gray-800">
              <SidebarTrigger className="text-white" />
              <div className="flex items-center space-x-4 ml-auto">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Monitoring</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Refresh Streams
                </Button>
              </div>
            </header>

            <main className="flex-1 p-4">
              <CameraGrid 
                layout={layout} 
                isFullscreen={isFullscreen}
                onSnapshot={captureSnapshot}
              />
            </main>
          </SidebarInset>
        </div>

        {/* Modals */}
        <SnapshotGallery 
          open={showSnapshots} 
          onClose={() => setShowSnapshots(false)} 
        />
        <HikvisionSetup 
          open={showHikvisionSetup} 
          onClose={() => setShowHikvisionSetup(false)} 
        />
      </SidebarProvider>
    </div>
  );
};

export default Index;
