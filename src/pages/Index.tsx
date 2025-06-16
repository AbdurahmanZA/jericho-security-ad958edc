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
  Menu
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
  
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const backendWsRef = useRef<WebSocket | null>(null);

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

  // Backend monitoring WebSocket
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    const connectBackendMonitoring = () => {
      addBackendLog("Attempting WebSocket connection to backend server");
      
      const ws = new WebSocket(`wss://192.168.0.138/api/logs`);
      backendWsRef.current = ws;

      ws.onopen = () => {
        addBackendLog("Live monitoring connection established");
        setBackendStatus(prev => ({ ...prev, isConnected: true, lastHeartbeat: new Date() }));
        
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'log') {
            addBackendLog(data.message);
          } else if (data.type === 'status') {
            setBackendStatus(prev => ({
              ...prev,
              activeStreams: data.activeStreams || 0,
              lastHeartbeat: new Date()
            }));
            addBackendLog(`System status updated - Active streams: ${data.activeStreams || 0}`);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        addBackendLog("Live monitoring disconnected (backend server unavailable)");
        setBackendStatus(prev => ({ ...prev, isConnected: false }));
        
        reconnectTimeout = setTimeout(connectBackendMonitoring, 5000);
      };

      ws.onerror = () => {
        addBackendLog("WebSocket connection failed - backend server may not be running");
      };
    };

    connectBackendMonitoring();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (backendWsRef.current) {
        backendWsRef.current.close();
      }
    };
  }, []);

  const handleSnapshot = async (cameraId: number) => {
    try {
      const response = await fetch(`https://192.168.0.138/api/cameras/${cameraId}/snapshot`, {
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
            <SidebarHeader className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-800 rounded-lg p-2">
                  <img 
                    src="/lovable-uploads/7cca0fa7-2e1b-4160-9134-844eadbfaf2d.png" 
                    alt="Jericho Security Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    JERICHO
                  </h1>
                  <p className="text-xs text-slate-400">
                    Security System
                  </p>
                </div>
              </div>
            </SidebarHeader>
            
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
          {/* Header - only show when not in fullscreen */}
          {!isFullscreen && (
            <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger className="text-white hover:bg-slate-700" />
                    <div className="flex items-center space-x-3">
                      <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                          JERICHO SECURITY
                        </h1>
                        <p className="text-sm text-slate-400">
                          Professional Video Surveillance System
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant={isFullscreen ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="text-white border-slate-600 hover:bg-slate-700"
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
          )}

          {/* Fullscreen toggle button when in fullscreen */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-50">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-white bg-slate-800/90 backdrop-blur-sm border-slate-600 hover:bg-slate-700"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className={isFullscreen ? "h-screen" : "h-[calc(100vh-200px)]"}>
              <CameraGrid
                layout={layout}
                isFullscreen={isFullscreen}
                onSnapshot={handleSnapshot}
                currentPage={currentPage}
                onLog={addLog}
              />
            </div>
          </div>

          {/* Bottom Bar - only show when not in fullscreen */}
          {!isFullscreen && (
            <div className="border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm">
              <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <span className="flex items-center space-x-2">
                      <Monitor className="w-4 h-4" />
                      <span>Cameras: {isFullscreen ? '12' : layout}</span>
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
                      className="text-white border-slate-600 hover:bg-slate-700"
                    >
                      Stream Logs ({logs.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBackendLogsOpen(true)}
                      className="text-white border-slate-600 hover:bg-slate-700"
                    >
                      Backend Logs ({backendLogs.length})
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

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
