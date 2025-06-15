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
import SystemStatusBox from "@/components/SystemStatusBox";
import CameraLayoutControls from "@/components/CameraLayoutControls";
import QuickActions from "@/components/QuickActions";
import StreamLogsDrawer from "@/components/StreamLogsDrawer";
import BackendLogsDrawer from "@/components/BackendLogsDrawer";

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
  const [showBackendLogDrawer, setShowBackendLogDrawer] = useState(false);
  const [backendLogs, setBackendLogs] = useState<string[]>([
    // These are sample backend logs. Replace with API/frontend logic as needed.
    "[2025-06-15 17:41:11] [INFO] Server booting up...",
    "[2025-06-15 17:41:13] [SYSTEM] Initiated RTSP relay worker pool",
    "[2025-06-15 17:41:14] [FFMPEG] FFMPEG v6.1.1 detected",
    "[2025-06-15 17:41:15] [HTTP] Started on 0.0.0.0:3001",
    "[2025-06-15 17:41:20] [AUTH] Key verified for camera endpoint",
    "[2025-06-15 17:41:22] [STREAM] Camera 1 stream started",
    "[2025-06-15 17:42:01] [SYSTEM] Certbot auto-renewal check complete",
    "[2025-06-15 17:42:10] [STREAM] Camera 2 stream error: Connection timeout",
    "[2025-06-15 17:43:44] [SYSTEM] Garbage collection completed for stale streams"
  ]);

  const TOTAL_CAMERAS = 32; // We'll support up to 32 cameras with pagination
  const totalPages = Math.ceil(TOTAL_CAMERAS / layout);

  // Move addDebugLog to the component top-level so it's accessible everywhere in Index
  const addDebugLog = (msg: string, category: string = 'SYSTEM') => {
    // Filter logs to focus on streams and important events
    const relevantCategories = ['STREAM', 'CAMERA', 'ERROR', 'CONNECTION'];
    if (!relevantCategories.includes(category)) {
      return; // Skip logging irrelevant messages
    }

    const timestamp = new Date().toLocaleTimeString();
    const detailedMsg = `[${timestamp}] [${category}] ${msg}`;
    console.log(detailedMsg);
    setDebugLogs(prev => [detailedMsg, ...prev].slice(0, 50)); // Keep fewer logs, focus on recent
  };

  const copyLogsToClipboard = async () => {
    try {
      if (!debugLogs.length) {
        toast({
          title: "No Logs",
          description: "There are no stream logs to copy.",
          variant: "destructive",
        });
        return;
      }
      await navigator.clipboard.writeText(debugLogs.join('\n'));
      toast({
        title: "Logs Copied",
        description: "RTSP stream logs copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy logs. Check your browser permissions or try a secure (https) page.",
        variant: "destructive",
      });
    }
  };

  const downloadLogsToFile = () => {
    if (!debugLogs.length) {
      toast({
        title: "No Logs",
        description: "There are no stream logs to download.",
        variant: "destructive",
      });
      return;
    }
    const blob = new Blob([debugLogs.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jericho-logs.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
    toast({
      title: "Logs Downloaded",
      description: "RTSP stream logs downloaded as jericho-logs.txt",
    });
  };

  useEffect(() => {
    // Initialize WebSocket connection with minimal logging
    const connectWebSocket = () => {
      const currentAttempt = connectionAttempts + 1;
      setConnectionAttempts(currentAttempt);

      try {
        if (currentAttempt === 1) {
          addDebugLog('Attempting to connect to WebSocket server for live monitoring', 'CONNECTION');
        }
        // Automatically select ws:// or wss:// depending on frontend protocol
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = "192.168.0.138:3001";  // You can change the IP if needed
        const wsUrl = `${wsProtocol}//${wsHost}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          addDebugLog('Live monitoring connection established', 'CONNECTION');
          setConnectionAttempts(0);
          toast({
            title: "System Connected",
            description: "Real-time monitoring active",
          });
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'motion') {
              setMotionEvents(prev => [data, ...prev.slice(0, 14)]);
              setSystemStatus(prev => ({ ...prev, totalEvents: prev.totalEvents + 1 }));
              addDebugLog(`Motion detected on Camera ${data.camera} (${data.severity} severity)`, 'CAMERA');
              
              toast({
                title: "Motion Detected",
                description: `Camera ${data.camera} - ${data.severity} alert`,
                variant: data.severity === 'high' ? 'destructive' : 'default',
              });
            } else if (data.type === 'status') {
              setSystemStatus(data.status);
            } else if (data.type === 'stream_error') {
              addDebugLog(`Stream error on Camera ${data.camera}: ${data.error}`, 'ERROR');
            } else if (data.type === 'stream_connected') {
              addDebugLog(`Stream connected successfully for Camera ${data.camera}`, 'STREAM');
            } else if (data.type === 'stream_disconnected') {
              addDebugLog(`Stream disconnected for Camera ${data.camera}`, 'STREAM');
            }
          } catch (parseError) {
            addDebugLog(`Failed to parse server message: ${parseError}`, 'ERROR');
          }
        };

        wsRef.current.onclose = (event) => {
          if (currentAttempt === 1) {
            addDebugLog('Live monitoring disconnected (no backend server available)', 'CONNECTION');
          }
          
          // Only try to reconnect a few times, then stop spamming
          if (currentAttempt < 3) {
            setTimeout(connectWebSocket, 5000);
          } else if (currentAttempt === 3) {
            addDebugLog('Stopped attempting WebSocket reconnection. This is normal without a backend server.', 'CONNECTION');
          }
        };

        wsRef.current.onerror = () => {
          // Only log the first error to avoid spam
          if (currentAttempt === 1) {
            addDebugLog('WebSocket connection failed - this is expected without a backend server', 'CONNECTION');
          }
        };
      } catch (error) {
        if (currentAttempt === 1) {
          addDebugLog(`WebSocket initialization failed: ${error.message}`, 'ERROR');
        }
        if (currentAttempt < 3) {
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
        addDebugLog(`Configuration loaded: ${config.layout} camera layout`, 'SYSTEM');
      } catch (error) {
        addDebugLog(`Failed to load saved configuration: ${error.message}`, 'ERROR');
      }
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
    setCurrentPage(1);
    addDebugLog(`Layout changed to ${newLayout} cameras`, 'SYSTEM');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setLayout(12); // Show all cameras in fullscreen
    }
    setCurrentPage(1);
    addDebugLog(`Fullscreen mode ${!isFullscreen ? 'enabled' : 'disabled'}`, 'SYSTEM');
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
      addDebugLog(`Capturing snapshot from Camera ${cameraId}`, 'CAMERA');
      const response = await fetch(`/api/snapshot/${cameraId}`, { method: 'POST' });
      if (response.ok) {
        addDebugLog(`Snapshot captured successfully from Camera ${cameraId}`, 'CAMERA');
        toast({
          title: "Snapshot Captured",
          description: `Camera ${cameraId} image saved`,
        });
      } else {
        throw new Error('Failed to capture snapshot');
      }
    } catch (error) {
      addDebugLog(`Snapshot failed for Camera ${cameraId}: ${error.message}`, 'ERROR');
      toast({
        title: "Snapshot Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMultipleCamerasSetup = (cameras: Array<{ id: number; name: string; url: string; }>) => {
    addDebugLog(`Multiple cameras setup initiated: ${cameras.length} cameras`, 'CAMERA');
    cameras.forEach(camera => {
      addDebugLog(`Camera ${camera.id} configured: ${camera.name} (${camera.url})`, 'STREAM');
    });
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
              <SystemStatusBox systemStatus={systemStatus} />
              <CameraLayoutControls
                layout={layout}
                isFullscreen={isFullscreen}
                onLayoutChange={handleLayoutChange}
                onToggleFullscreen={toggleFullscreen}
              />
              <QuickActions
                onShowSnapshots={() => setShowSnapshots(true)}
                onShowHikvisionSetup={() => setShowHikvisionSetup(true)}
                onShowSettings={() => {}} // optional: handle direct settings
              />
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
                  Stream Logs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBackendLogDrawer(true)}
                  className="jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary font-semibold text-xs uppercase tracking-wide"
                >
                  <ListIcon className="w-4 h-4 mr-2" />
                  Backend Logs
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
                  onLog={(msg) => addDebugLog(msg, 'STREAM')}
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

        {/* Stream Logs Drawer */}
        <StreamLogsDrawer
          open={showLogDrawer}
          onOpenChange={setShowLogDrawer}
          logs={debugLogs}
          onCopy={copyLogsToClipboard}
          onDownload={downloadLogsToFile}
          onClear={() => setDebugLogs([])}
          activeStreams={systemStatus.activeStreams}
        />

        {/* Backend Logs Drawer */}
        <BackendLogsDrawer
          open={showBackendLogDrawer}
          onOpenChange={setShowBackendLogDrawer}
          logs={backendLogs}
          onCopy={async () => {
            if (backendLogs.length) {
              await navigator.clipboard.writeText(backendLogs.join('\n'));
            }
          }}
          onDownload={() => {
            if (!backendLogs.length) return;
            const blob = new Blob([backendLogs.join('\n')], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'backend-logs.txt';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 0);
          }}
          onClear={() => setBackendLogs([])}
        />

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
