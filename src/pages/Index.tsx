
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
import { Camera, Settings, Image, Monitor, Video, Bell, Shield } from 'lucide-react';
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
          <Sidebar className="border-r border-gray-700 jericho-primary-bg">
            <SidebarHeader className="p-4 border-b border-jericho-secondary">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 jericho-gradient rounded-lg flex items-center justify-center jericho-shield">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold jericho-brand text-white">
                    JERICHO
                  </h1>
                  <p className="text-sm jericho-security-text font-semibold tracking-wider">
                    SECURITY
                  </p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-4 jericho-primary-bg">
              {/* System Status */}
              <div className="mb-6 p-4 jericho-secondary-bg rounded-lg border border-jericho-light/20">
                <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
                  System Status
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-jericho-light">Uptime:</span>
                    <span className="text-green-400 font-semibold">{systemStatus.uptime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-jericho-light">Active Streams:</span>
                    <span className="text-blue-400 font-semibold">{systemStatus.activeStreams}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-jericho-light">Motion Events:</span>
                    <span className="text-jericho-accent font-semibold">{systemStatus.totalEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-jericho-light">Hikvision:</span>
                    <span className="text-purple-400 font-semibold">{systemStatus.hikvisionConnections}</span>
                  </div>
                </div>
              </div>

              {/* Layout Controls */}
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
                  Camera Layout
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4, 6, 9, 12].map((num) => (
                    <Button
                      key={num}
                      variant={layout === num ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLayoutChange(num)}
                      className={`text-xs font-semibold ${
                        layout === num 
                          ? 'jericho-btn-accent text-jericho-primary' 
                          : 'jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary'
                      }`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={isFullscreen ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFullscreen}
                  className={`w-full mt-3 text-xs font-semibold ${
                    isFullscreen 
                      ? 'jericho-btn-accent text-jericho-primary' 
                      : 'jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary'
                  }`}
                >
                  <Monitor className="w-3 h-3 mr-2" />
                  4×3 VIEW
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSnapshots(true)}
                    className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                  >
                    <Image className="w-3 h-3 mr-2" />
                    VIEW SNAPSHOTS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHikvisionSetup(true)}
                    className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                  >
                    <Settings className="w-3 h-3 mr-2" />
                    HIKVISION SETUP
                  </Button>
                </div>
              </div>

              {/* Motion Log */}
              <MotionLog events={motionEvents} />
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-gray-700 jericho-secondary-bg">
              <SidebarTrigger className="text-white hover:text-jericho-accent" />
              <div className="flex items-center space-x-4 ml-auto">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full security-pulse"></div>
                  <span className="font-semibold uppercase tracking-wide text-jericho-very-light">
                    Live Monitoring
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  Refresh Streams
                </Button>
              </div>
            </header>

            <main className="flex-1 p-4 bg-gray-900">
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
