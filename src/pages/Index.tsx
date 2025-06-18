import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CameraGrid } from '@/components/CameraGrid';
import { 
  Monitor, 
  Activity, 
  AlertTriangle, 
  Maximize2, 
  Minimize2,
  Camera,
  Settings,
  Eye,
  Menu,
  Plus
} from 'lucide-react';
import { 
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import CameraLayoutControls from '@/components/CameraLayoutControls';
import SystemStatusBox from '@/components/SystemStatusBox';
import QuickActions from '@/components/QuickActions';
import StreamLogsDrawer from '@/components/StreamLogsDrawer';
import BackendLogsDrawer from '@/components/BackendLogsDrawer';
import { ComprehensiveCameraSetup } from '@/components/ComprehensiveCameraSetup';
import { SaveLayoutButton } from '@/components/SaveLayoutButton';
import { config } from '@/config/environment';

const Index = () => {
  const [layout, setLayout] = useState(4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [backendStatus, setBackendStatus] = useState({
    isConnected: false,
    activeStreams: 0,
    lastHeartbeat: null as Date | null
  });
  const [streamLogsOpen, setStreamLogsOpen] = useState(false);
  const [backendLogsOpen, setBackendLogsOpen] = useState(false);
  const [showCameraSetup, setShowCameraSetup] = useState(false);
  const [cameraUrls, setCameraUrls] = useState<Record<number, string>>({});
  const [cameraNames, setCameraNames] = useState<Record<number, string>>({});
  const [useUniversalPlayer, setUseUniversalPlayer] = useState(true);
  
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const backendWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);
  const connectionAttemptsRef = useRef(0);
  const lastConnectionAttemptRef = useRef(0);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-99), logEntry]);
  };

  const addBackendLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setBackendLogs(prev => [...prev.slice(-99), logEntry]);
  };

  // Load layout preference
  useEffect(() => {
    const savedLayout = localStorage.getItem('jericho-camera-layout');
    if (savedLayout) {
      const parsed = JSON.parse(savedLayout);
      setLayout(parsed.layout || 4);
      addLog(`Loaded saved configuration: ${parsed.layout} camera layout`);
    }
  }, []);

  // Save layout preference
  useEffect(() => {
    localStorage.setItem('jericho-camera-layout', JSON.stringify({ 
      layout,
      lastUpdated: new Date().toISOString()
    }));
  }, [layout]);

  // Exponential backoff for backend connections
  const getBackoffDelay = (attempt: number) => {
    return Math.min(5000 * Math.pow(1.5, attempt), 60000); // Cap at 1 minute
  };

  // Backend monitoring WebSocket with improved connection management
  useEffect(() => {
    const connectBackendMonitoring = () => {
      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
      const requiredDelay = getBackoffDelay(connectionAttemptsRef.current);

      // Rate limiting: don't attempt connection too frequently
      if (timeSinceLastAttempt < requiredDelay) {
        const remainingDelay = requiredDelay - timeSinceLastAttempt;
        addBackendLog(`Rate limiting connection attempt, waiting ${Math.round(remainingDelay/1000)}s`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectBackendMonitoring();
        }, remainingDelay);
        return;
      }

      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current) {
        addBackendLog('Connection attempt already in progress, skipping');
        return;
      }

      // Clean up existing connection
      if (backendWsRef.current && backendWsRef.current.readyState !== WebSocket.CLOSED) {
        backendWsRef.current.close();
        backendWsRef.current = null;
      }

      isConnectingRef.current = true;
      lastConnectionAttemptRef.current = now;
      connectionAttemptsRef.current += 1;
      
      const wsUrl = config.backend.wsUrl;
      addBackendLog(`Backend connection attempt ${connectionAttemptsRef.current} to ${wsUrl}`);
      
      try {
        const ws = new WebSocket(wsUrl);
        backendWsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            addBackendLog('Connection timeout, closing WebSocket');
            ws.close();
          }
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          connectionAttemptsRef.current = 0; // Reset on successful connection
          addBackendLog(`Successfully connected to backend via ${wsUrl}`);
          setBackendStatus(prev => ({ ...prev, isConnected: true, lastHeartbeat: new Date() }));
          
          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'log') {
              addBackendLog(data.message);
            } else if (data.type === 'status' || data.type === 'connection_status') {
              setBackendStatus(prev => ({
                ...prev,
                activeStreams: data.activeStreams || prev.activeStreams,
                lastHeartbeat: new Date()
              }));
              addBackendLog(`System status updated - Active streams: ${data.activeStreams || 0}`);
            }
          } catch (error) {
            // Ignore parse errors for non-JSON messages
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          
          const wasCleanClose = event.code === 1000;
          addBackendLog(`Backend monitoring disconnected (code: ${event.code}, clean: ${wasCleanClose})`);
          setBackendStatus(prev => ({ ...prev, isConnected: false }));
          
          // Only reconnect if not manually closed and we haven't exceeded max attempts
          if (!wasCleanClose && connectionAttemptsRef.current < 10) {
            const delay = getBackoffDelay(connectionAttemptsRef.current);
            addBackendLog(`Scheduling reconnection in ${Math.round(delay/1000)} seconds`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectBackendMonitoring();
            }, delay);
          } else if (connectionAttemptsRef.current >= 10) {
            addBackendLog('Max connection attempts reached, stopping automatic reconnection');
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          addBackendLog(`WebSocket error: Backend server may not be running on ${wsUrl}`);
        };
      } catch (error: any) {
        isConnectingRef.current = false;
        addBackendLog(`Failed to create WebSocket connection: ${error.message}`);
      }
    };

    // Initial connection with small delay to prevent immediate loops
    const initialTimeout = setTimeout(() => {
      connectBackendMonitoring();
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      isConnectingRef.current = false;
      connectionAttemptsRef.current = 0;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      if (backendWsRef.current) {
        backendWsRef.current.close();
        backendWsRef.current = null;
      }
    };
  }, []); // Empty dependency array to prevent re-running

  const handleSnapshot = async (cameraId: number) => {
    try {
      const response = await fetch(`${config.backend.apiUrl}/cameras/${cameraId}/snapshot`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Snapshot Captured",
          description: `Camera ${cameraId} snapshot saved successfully`,
        });
        addLog(`Snapshot captured for Camera ${cameraId}`);
      } else {
        throw new Error('Snapshot failed');
      }
    } catch (error) {
      toast({
        title: "Snapshot Failed",
        description: `Could not capture snapshot for Camera ${cameraId}`,
        variant: "destructive",
      });
      addLog(`Snapshot failed for Camera ${cameraId}: ${error.message}`);
    }
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
    
    if (addLog) {
      addLog(`Added ${cameras.length} cameras from comprehensive setup`);
    }
  };

  const totalPages = isFullscreen ? 1 : Math.ceil(12 / layout);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    addLog(`Switched to page ${page}`);
  };

  const copyLogs = (logType: 'stream' | 'backend') => {
    const logsToCopy = logType === 'stream' ? logs : backendLogs;
    navigator.clipboard.writeText(logsToCopy.join('\n'));
    toast({
      title: "Logs Copied",
      description: `${logType === 'stream' ? 'Stream' : 'Backend'} logs copied to clipboard`,
    });
  };

  const downloadLogs = (logType: 'stream' | 'backend') => {
    const logsToCopy = logType === 'stream' ? logs : backendLogs;
    const blob = new Blob([logsToCopy.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jericho-${logType}-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = (logType: 'stream' | 'backend') => {
    if (logType === 'stream') {
      setLogs([]);
    } else {
      setBackendLogs([]);
    }
    toast({
      title: "Logs Cleared",
      description: `${logType === 'stream' ? 'Stream' : 'Backend'} logs cleared`,
    });
  };

  const systemStatus = {
    uptime: "2h 34m",
    activeStreams: backendStatus.activeStreams,
    totalEvents: 0,
    hikvisionConnections: 0
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {!isFullscreen && (
          <Sidebar>
            <SidebarContent className="p-4 space-y-6">
              <SidebarGroup>
                <SidebarGroupLabel>Camera Layout</SidebarGroupLabel>
                <SidebarGroupContent>
                  <CameraLayoutControls
                    layout={layout}
                    isFullscreen={isFullscreen}
                    onLayoutChange={setLayout}
                    onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
                  />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>System Status</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SystemStatusBox systemStatus={systemStatus} />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
                <SidebarGroupContent>
                  <QuickActions 
                    onShowSnapshots={() => {}}
                    onShowHikvisionSetup={() => {}}
                    onShowSettings={() => {}}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        )}

        <main className="flex-1 flex flex-col">
          {/* Enhanced Header with Camera Controls */}
          <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {!isFullscreen && <SidebarTrigger className="text-white hover:bg-slate-700" />}
                  <div className="flex items-center space-x-4">
                    {/* Enlarged Logo - increased from w-16 h-16 to w-24 h-24 */}
                    <div className="w-24 h-24 bg-slate-800 rounded-lg p-3">
                      <img 
                        src="/lovable-uploads/7cca0fa7-2e1b-4160-9134-844eadbfaf2d.png" 
                        alt="Jericho Security Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {!isFullscreen && (
                      <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                          JERICHO SECURITY
                        </h1>
                        <p className="text-sm text-slate-400">
                          Professional Video Surveillance System
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Controls Section */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span>Page {currentPage} • {layout} cameras</span>
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

                    <Button
                      variant={isFullscreen ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="w-4 h-4 mr-2" />
                          Exit Fullscreen
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-4 h-4 mr-2" />
                          Fullscreen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <CameraGrid
              layout={layout}
              isFullscreen={isFullscreen}
              onSnapshot={handleSnapshot}
              currentPage={currentPage}
              onLog={addLog}
              cameraUrls={cameraUrls}
              cameraNames={cameraNames}
              onCameraUrlsChange={setCameraUrls}
              onCameraNamesChange={setCameraNames}
              useUniversalPlayer={useUniversalPlayer}
            />
          </div>

          {/* Bottom Bar - only show when not in fullscreen */}
          {!isFullscreen && (
            <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm">
              <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4" />
                      <span>Cameras: {layout}</span>
                    </span>
                    <span className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span>Active: {backendStatus.activeStreams}</span>
                    </span>
                    <span className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${backendStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Backend: {backendStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStreamLogsOpen(true)}
                      className="bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
                    >
                      Stream Logs ({logs.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBackendLogsOpen(true)}
                      className="bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
                    >
                      Backend Logs ({backendLogs.length})
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <ComprehensiveCameraSetup
          open={showCameraSetup}
          onClose={() => setShowCameraSetup(false)}
          onAddCameras={handleAddCameras}
          existingCameras={cameraUrls}
        />
        
        <StreamLogsDrawer 
          open={streamLogsOpen}
          onOpenChange={setStreamLogsOpen}
          logs={logs}
          onCopy={() => copyLogs('stream')}
          onDownload={() => downloadLogs('stream')}
          onClear={() => clearLogs('stream')}
          activeStreams={backendStatus.activeStreams}
        />
        
        <BackendLogsDrawer 
          open={backendLogsOpen}
          onOpenChange={setBackendLogsOpen}
          logs={backendLogs}
          onCopy={() => copyLogs('backend')}
          onDownload={() => downloadLogs('backend')}
          onClear={() => clearLogs('backend')}
        />
      </div>
    </SidebarProvider>
  );
};

export default Index;
