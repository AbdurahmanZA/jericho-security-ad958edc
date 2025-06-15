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
import { Camera, Settings, Image, Monitor, Video, Bell, Shield, Plus, Save, ChevronLeft, ChevronRight, ExternalLink, Copy } from 'lucide-react';
import { CameraGrid } from '@/components/CameraGrid';
import { MotionLog } from '@/components/MotionLog';
import { SnapshotGallery } from '@/components/SnapshotGallery';
import { HikvisionSetup } from '@/components/HikvisionSetup';
import { MultipleCameraSetup } from '@/components/MultipleCameraSetup';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription } from "@/components/ui/drawer";
import { AlertTriangle, List as ListIcon } from "lucide-react";

const Index = () => {
  const [layout, setLayout] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHikvisionSetup, setShowHikvisionSetup] = useState(false);
  const [showMultipleCameraSetup, setShowMultipleCameraSetup] = useState(false);
  const [motionEvents, setMotionEvents] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    uptime: '00:00:00',
    activeStreams: 0,
    totalEvents: 0,
    hikvisionConnections: 0
  });
  const wsRef = useRef(null);
  const { toast } = useToast();
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const TOTAL_CAMERAS = 32; // We'll support up to 32 cameras with pagination
  const totalPages = Math.ceil(TOTAL_CAMERAS / layout);

  // Move addDebugLog to the component top-level so it's accessible everywhere in Index
  const addDebugLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const detailedMsg = `[${timestamp}] ${msg}`;
    console.log(detailedMsg);
    setDebugLogs(prev => [detailedMsg, ...prev].slice(0, 100));
  };

  const copyLogsToClipboard = async () => {
    try {
      const logsText = debugLogs.join('\n');
      await navigator.clipboard.writeText(logsText);
      toast({
        title: "Logs Copied",
        description: "Debug logs copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy logs to clipboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initialize WebSocket connection
    const connectWebSocket = () => {
      const currentAttempt = connectionAttempts + 1;
      setConnectionAttempts(currentAttempt);
      
      try {
        addDebugLog(`WebSocket connection attempt #${currentAttempt} to ws://localhost:3001`);
        wsRef.current = new WebSocket('ws://localhost:3001');
        
        wsRef.current.onopen = () => {
          addDebugLog('WebSocket connection established successfully');
          setConnectionAttempts(0); // Reset on successful connection
          toast({
            title: "System Connected",
            description: "Real-time monitoring active",
          });
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addDebugLog(`WebSocket message received: ${JSON.stringify(data)}`);
            
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
          } catch (parseError) {
            addDebugLog(`Failed to parse WebSocket message: ${event.data} - Error: ${parseError}`);
          }
        };
        
        wsRef.current.onclose = (event) => {
          const reason = event.reason || 'No reason provided';
          const code = event.code || 'Unknown code';
          addDebugLog(`WebSocket connection closed. Code: ${code}, Reason: ${reason}, Clean: ${event.wasClean}`);
          addDebugLog(`This is normal if no backend server is running. Will retry in 5 seconds...`);
          
          // Only try to reconnect if we haven't made too many attempts
          if (currentAttempt < 5) {
            setTimeout(connectWebSocket, 5000);
          } else {
            addDebugLog(`Max connection attempts (${currentAttempt}) reached. Stopping reconnection attempts.`);
          }
        };
        
        wsRef.current.onerror = (error) => {
          addDebugLog(`WebSocket error occurred: ${JSON.stringify({
            type: error.type,
            target: error.target?.readyState,
            timestamp: Date.now()
          })}`);
          addDebugLog(`This error is expected when no backend WebSocket server is available`);
        };
      } catch (error) {
        addDebugLog(`Failed to create WebSocket connection: ${error.message || error}`);
        if (currentAttempt < 5) {
          setTimeout(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    // Load saved configuration
    const savedConfig = localStorage.getItem('jericho-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setLayout(config.layout || 4);
        setIsFullscreen(config.fullscreen || false);
        addDebugLog(`Loaded saved configuration: Layout ${config.layout}, Fullscreen: ${config.fullscreen}`);
      } catch (error) {
        addDebugLog(`Failed to parse saved configuration: ${error.message}`);
      }
    }

    return () => {
      if (wsRef.current) {
        addDebugLog('Closing WebSocket connection due to component unmount');
        wsRef.current.close();
      }
    };
  }, [toast, addDebugLog]);

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
    setCurrentPage(1);
    addDebugLog(`Layout changed to ${newLayout} cameras`);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setLayout(12); // Show all cameras in fullscreen
    }
    setCurrentPage(1);
    addDebugLog(`Fullscreen mode ${!isFullscreen ? 'enabled' : 'disabled'}`);
  };

  const saveLayout = () => {
    const config = {
      layout,
      fullscreen: isFullscreen,
      timestamp: Date.now()
    };
    localStorage.setItem('jericho-config', JSON.stringify(config));
    toast({
      title: "Layout Saved",
      description: "Your camera layout configuration has been saved",
    });
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

  const handleMultipleCamerasSetup = (cameras: Array<{ id: number; name: string; url: string; }>) => {
    // Handle the camera setup logic here
    toast({
      title: "Multiple Cameras Added",
      description: `${cameras.length} cameras configured successfully`,
    });
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleOpenMultiView = () => {
    const nextPage = currentPage + 1;
    if (nextPage > totalPages) {
      toast({
        title: "No More Camera Pages",
        description: `You've reached the end. There are only ${totalPages} pages of cameras.`,
        variant: "destructive",
      });
      return;
    }
    window.open(`/multiview?page=${nextPage}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-border jericho-primary-bg">
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
                  <Link to="/settings">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                    >
                      <Settings className="w-3 h-3 mr-2" />
                      SYSTEM SETTINGS
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Motion Log */}
              <MotionLog events={motionEvents} />
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1 flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border jericho-secondary-bg">
              <SidebarTrigger className="text-foreground hover:text-jericho-accent" />
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
                  onClick={() => setShowMultipleCameraSetup(true)}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cameras
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveLayout}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Layout
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMultiView}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  2nd Screen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  Refresh Streams
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogDrawer(true)}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  <ListIcon className="w-4 h-4 mr-2" />
                  Debug Logs
                </Button>
                <ThemeToggle />
              </div>
            </header>

            <main className="flex-1 p-4 bg-background flex flex-col">
              <div className="flex-grow">
                <CameraGrid 
                  layout={layout} 
                  isFullscreen={isFullscreen}
                  onSnapshot={captureSnapshot}
                  currentPage={currentPage}
                  onLog={addDebugLog}
                />
              </div>
              {!isFullscreen && totalPages > 1 && (
                <div className="flex-shrink-0 flex justify-center items-center pt-4 space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-jericho-light">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </main>
          </SidebarInset>
        </div>

        {/* Log Drawer */}
        <Drawer open={showLogDrawer} onOpenChange={setShowLogDrawer}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                <ListIcon className="inline w-5 h-5 mr-2" />
                Debug Logs ({debugLogs.length})
              </DrawerTitle>
              <DrawerDescription>
                Detailed system logs including WebSocket connections, stream errors, and troubleshooting information.
              </DrawerDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLogsToClipboard}
                  disabled={debugLogs.length === 0}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDebugLogs([])}
                  disabled={debugLogs.length === 0}
                >
                  Clear Logs
                </Button>
                <span className="text-xs text-muted-foreground">
                  Connection attempts: {connectionAttempts}
                </span>
              </div>
            </DrawerHeader>
            <div className="max-h-96 overflow-y-auto px-4 pb-4">
              {debugLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No debug logs yet</p>
                  <p className="text-xs mt-1">WebSocket connection errors and stream issues will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {debugLogs.map((log, idx) => (
                    <li key={idx} className="text-xs font-mono bg-muted/50 rounded px-3 py-2 break-all">
                      {log}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DrawerContent>
        </Drawer>
        {/* Modals */}
        <SnapshotGallery 
          open={showSnapshots} 
          onClose={() => setShowSnapshots(false)} 
        />
        <HikvisionSetup 
          open={showHikvisionSetup} 
          onClose={() => setShowHikvisionSetup(false)} 
        />
        <MultipleCameraSetup
          open={showMultipleCameraSetup}
          onClose={() => setShowMultipleCameraSetup(false)}
          onSave={handleMultipleCamerasSetup}
          existingCameras={{}}
        />
      </SidebarProvider>
    </div>
  );
};

export default Index;
