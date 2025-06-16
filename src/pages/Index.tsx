
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CameraGrid } from '@/components/CameraGrid';
import { CameraLayoutControls } from '@/components/CameraLayoutControls';
import { StreamLogsDrawer } from '@/components/StreamLogsDrawer';
import { BackendLogsDrawer } from '@/components/BackendLogsDrawer';
import { QuickActions } from '@/components/QuickActions';
import { SystemStatusBox } from '@/components/SystemStatusBox';
import { 
  Monitor, 
  Activity, 
  AlertTriangle, 
  Maximize2, 
  Minimize2,
  Camera,
  Settings,
  Eye
} from 'lucide-react';

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
        
        // Clear any existing reconnect timeout
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
        
        // Attempt reconnection after 5 seconds
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Camera className="w-6 h-6 text-white" />
                </div>
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
              <SystemStatusBox 
                isConnected={backendStatus.isConnected}
                activeStreams={backendStatus.activeStreams}
                lastHeartbeat={backendStatus.lastHeartbeat}
              />
              
              <QuickActions onSnapshot={handleSnapshot} />
              
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

      {/* Controls */}
      {!isFullscreen && (
        <div className="border-b border-slate-700 bg-slate-800/50">
          <div className="px-6 py-3">
            <CameraLayoutControls
              layout={layout}
              onLayoutChange={setLayout}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="h-[calc(100vh-200px)]">
          <CameraGrid
            layout={layout}
            isFullscreen={isFullscreen}
            onSnapshot={handleSnapshot}
            currentPage={currentPage}
            onLog={addLog}
          />
        </div>
      </div>

      {/* Bottom Bar */}
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
              <StreamLogsDrawer logs={logs} />
              <BackendLogsDrawer logs={backendLogs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
