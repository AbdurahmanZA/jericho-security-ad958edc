import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  Database, 
  Wifi, 
  Camera, 
  Activity,
  Shield,
  Globe,
  Zap,
  Clock,
  HardDrive,
  Play,
  Square,
  Eye,
  Terminal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  details?: string;
  lastChecked: Date;
  icon: React.ComponentType<any>;
}

interface StreamLog {
  timestamp: Date;
  cameraId: number;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface CameraStatus {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  streamStatus: 'stopped' | 'connecting' | 'active' | 'error';
  connectionType?: 'webrtc' | 'hls';
  lastActivity: Date;
  errorMessage?: string;
}

const Status = () => {
  const [checks, setChecks] = useState<Record<string, HealthCheck>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamLogs, setStreamLogs] = useState<StreamLog[]>([]);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus[]>([]);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [realTimeStats, setRealTimeStats] = useState({
    activeStreams: 0,
    connectedClients: 0,
    lastUpdate: new Date()
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const logIntervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const addStreamLog = (cameraId: number, action: string, status: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog: StreamLog = {
      timestamp: new Date(),
      cameraId,
      action,
      status,
      message
    };
    
    setStreamLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100); // Keep last 100 logs
      return updated;
    });
  };

  const updateCameraStatus = (cameraId: number, updates: Partial<CameraStatus>) => {
    setCameraStatuses(prev => {
      const existing = prev.find(c => c.id === cameraId);
      if (existing) {
        return prev.map(c => c.id === cameraId ? { ...c, ...updates, lastActivity: new Date() } : c);
      } else {
        return [...prev, {
          id: cameraId,
          name: `Camera ${cameraId}`,
          url: '',
          isActive: false,
          streamStatus: 'stopped',
          lastActivity: new Date(),
          ...updates
        }];
      }
    });
  };

  // WebSocket connection for real-time monitoring
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setWsStatus('connecting');
    addStreamLog(0, 'websocket', 'info', 'Attempting WebSocket connection for monitoring...');
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        addStreamLog(0, 'websocket', 'success', 'WebSocket monitoring connected successfully');
        
        // Send a ping to test connection
        ws.send(JSON.stringify({ type: 'monitor_ping', timestamp: Date.now() }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Log WebSocket messages for debugging
          addStreamLog(0, 'websocket_msg', 'info', `Received: ${data.type}${data.cameraId ? ` (Camera ${data.cameraId})` : ''}`);
          
          switch (data.type) {
            case 'stream_started':
              updateCameraStatus(data.cameraId, { 
                streamStatus: 'active', 
                isActive: true,
                connectionType: 'hls'
              });
              addStreamLog(data.cameraId, 'stream_start', 'success', 'HLS stream started successfully');
              break;
              
            case 'stream_stopped':
              updateCameraStatus(data.cameraId, { 
                streamStatus: 'stopped', 
                isActive: false 
              });
              addStreamLog(data.cameraId, 'stream_stop', 'info', 'Stream stopped');
              break;
              
            case 'stream_error':
              updateCameraStatus(data.cameraId, { 
                streamStatus: 'error', 
                errorMessage: data.error 
              });
              addStreamLog(data.cameraId, 'stream_error', 'error', `Stream error: ${data.error}`);
              break;
              
            case 'webrtc_stream_ready':
              updateCameraStatus(data.cameraId, { 
                streamStatus: 'active', 
                connectionType: 'webrtc' 
              });
              addStreamLog(data.cameraId, 'webrtc_ready', 'success', 'WebRTC stream is ready');
              break;
              
            case 'connection_status':
              addStreamLog(0, 'status', 'info', `Backend status: ${data.status}`);
              break;
          }
          
          // Update real-time stats if provided
          if (data.activeStreams !== undefined) {
            setRealTimeStats(prev => ({
              ...prev,
              activeStreams: data.activeStreams,
              lastUpdate: new Date()
            }));
          }
        } catch (error) {
          addStreamLog(0, 'websocket_error', 'error', `Failed to parse WebSocket message: ${error}`);
        }
      };

      ws.onclose = (event) => {
        setWsStatus('disconnected');
        addStreamLog(0, 'websocket', 'warning', `WebSocket disconnected (code: ${event.code})`);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setWsStatus('error');
        addStreamLog(0, 'websocket', 'error', 'WebSocket connection error');
      };

    } catch (error) {
      setWsStatus('error');
      addStreamLog(0, 'websocket', 'error', `WebSocket setup failed: ${error}`);
    }
  };

  // Test individual camera connections
  const testCameraConnection = async (cameraId: number) => {
    addStreamLog(cameraId, 'test_start', 'info', 'Starting connection test...');
    updateCameraStatus(cameraId, { streamStatus: 'connecting' });

    try {
      // Test stream status endpoint
      const statusResponse = await fetch(`/api/streams/${cameraId}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        addStreamLog(cameraId, 'test_status', 'success', `Stream status: ${statusData.status}`);
        updateCameraStatus(cameraId, { streamStatus: statusData.status === 'running' ? 'active' : 'stopped' });
      } else {
        addStreamLog(cameraId, 'test_status', 'error', `Status check failed: ${statusResponse.status}`);
      }

      // Test WebRTC availability
      const webrtcResponse = await fetch(`/api/webrtc/streams/${cameraId}/status`);
      if (webrtcResponse.ok) {
        const webrtcData = await webrtcResponse.json();
        addStreamLog(cameraId, 'test_webrtc', webrtcData.webrtc_available ? 'success' : 'warning', 
          `WebRTC ${webrtcData.webrtc_available ? 'available' : 'not available'}`);
      }

      // Test HLS stream availability
      const hlsResponse = await fetch(`/hls/camera_${cameraId}.m3u8`, { method: 'HEAD' });
      if (hlsResponse.ok) {
        addStreamLog(cameraId, 'test_hls', 'success', 'HLS stream file exists');
      } else {
        addStreamLog(cameraId, 'test_hls', 'warning', 'HLS stream file not found');
      }

    } catch (error) {
      addStreamLog(cameraId, 'test_error', 'error', `Connection test failed: ${error}`);
      updateCameraStatus(cameraId, { streamStatus: 'error', errorMessage: error.message });
    }
  };

  // Start a camera stream for testing
  const startTestStream = async (cameraId: number) => {
    addStreamLog(cameraId, 'start_test', 'info', 'Starting test stream...');
    updateCameraStatus(cameraId, { streamStatus: 'connecting' });

    try {
      const response = await fetch(`/api/streams/${cameraId}/start`, { method: 'POST' });
      if (response.ok) {
        addStreamLog(cameraId, 'start_success', 'success', 'Stream start command sent');
      } else {
        const error = await response.text();
        addStreamLog(cameraId, 'start_error', 'error', `Stream start failed: ${error}`);
      }
    } catch (error) {
      addStreamLog(cameraId, 'start_error', 'error', `Stream start request failed: ${error}`);
    }
  };

  // Stop a camera stream
  const stopTestStream = async (cameraId: number) => {
    addStreamLog(cameraId, 'stop_test', 'info', 'Stopping test stream...');

    try {
      const response = await fetch(`/api/streams/${cameraId}/stop`, { method: 'POST' });
      if (response.ok) {
        addStreamLog(cameraId, 'stop_success', 'success', 'Stream stop command sent');
        updateCameraStatus(cameraId, { streamStatus: 'stopped', isActive: false });
      } else {
        addStreamLog(cameraId, 'stop_error', 'error', `Stream stop failed`);
      }
    } catch (error) {
      addStreamLog(cameraId, 'stop_error', 'error', `Stream stop request failed: ${error}`);
    }
  };

  // Load camera configuration from localStorage
  const loadCameraConfig = () => {
    try {
      const savedStreams = localStorage.getItem('jericho-stream-urls');
      if (savedStreams) {
        const parsed = JSON.parse(savedStreams);
        Object.entries(parsed).forEach(([id, url]) => {
          updateCameraStatus(parseInt(id), {
            id: parseInt(id),
            name: `Camera ${id}`,
            url: url as string,
            streamStatus: 'stopped',
            isActive: false
          });
        });
        addStreamLog(0, 'config_load', 'success', `Loaded ${Object.keys(parsed).length} camera configurations`);
      }
    } catch (error) {
      addStreamLog(0, 'config_error', 'error', `Failed to load camera config: ${error}`);
    }
  };

  const updateCheck = (key: string, update: Partial<HealthCheck>) => {
    setChecks(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update, lastChecked: new Date() }
    }));
  };

  const initializeChecks = () => {
    const initialChecks: Record<string, Omit<HealthCheck, 'lastChecked'>> = {
      backend: {
        name: 'Backend Server',
        status: 'checking',
        message: 'Checking backend server status...',
        icon: Server
      },
      websocket: {
        name: 'WebSocket Connection',
        status: 'checking',
        message: 'Checking WebSocket connectivity...',
        icon: Wifi
      },
      database: {
        name: 'SQLite Database',
        status: 'checking',
        message: 'Checking database connectivity...',
        icon: Database
      },
      ffmpeg: {
        name: 'FFmpeg Service',
        status: 'checking',
        message: 'Checking FFmpeg availability...',
        icon: Camera
      },
      streams: {
        name: 'Active Streams',
        status: 'checking',
        message: 'Checking stream status...',
        icon: Activity
      }
    };

    const checksWithTimestamp = Object.fromEntries(
      Object.entries(initialChecks).map(([key, check]) => [
        key, 
        { ...check, lastChecked: new Date() }
      ])
    );

    setChecks(checksWithTimestamp);
  };

  const checkBackendServer = async () => {
    try {
      const response = await fetch('/api/status', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        updateCheck('backend', {
          status: 'healthy',
          message: `Backend server running (${data.status})`,
          details: `Active streams: ${data.activeStreams}, Connected clients: ${data.connectedClients}`
        });
        
        setRealTimeStats(prev => ({
          ...prev,
          activeStreams: data.activeStreams,
          connectedClients: data.connectedClients,
          lastUpdate: new Date()
        }));
        
        addStreamLog(0, 'backend_check', 'success', `Backend healthy - ${data.activeStreams} active streams`);
      } else {
        updateCheck('backend', {
          status: 'error',
          message: `Backend server responded with ${response.status}`,
          details: 'Server may be experiencing issues'
        });
        addStreamLog(0, 'backend_check', 'error', `Backend responded with status ${response.status}`);
      }
    } catch (error) {
      updateCheck('backend', {
        status: 'error',
        message: 'Backend server not responding',
        details: 'Server may not be running or network issue'
      });
      addStreamLog(0, 'backend_check', 'error', `Backend check failed: ${error}`);
    }
  };

  const checkWebSocket = () => {
    updateCheck('websocket', {
      status: wsStatus === 'connected' ? 'healthy' : wsStatus === 'connecting' ? 'warning' : 'error',
      message: `WebSocket ${wsStatus}`,
      details: wsStatus === 'connected' ? 'Real-time communication available' : 'WebSocket connection issues'
    });
  };

  const runAllChecks = async () => {
    setIsRefreshing(true);
    initializeChecks();
    addStreamLog(0, 'health_check', 'info', 'Running comprehensive system health check...');

    try {
      await Promise.allSettled([
        checkBackendServer()
      ]);
      checkWebSocket();
    } catch (error) {
      toast({
        title: "Health Check Error",
        description: "Some health checks failed to complete",
        variant: "destructive"
      });
      addStreamLog(0, 'health_check', 'error', `Health check failed: ${error}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCameraConfig();
    connectWebSocket();
    runAllChecks();

    const interval = setInterval(() => {
      runAllChecks();
      cameraStatuses.forEach(camera => {
        if (camera.streamStatus === 'active') {
          testCameraConnection(camera.id);
        }
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'checking': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'error': return <Badge className="bg-red-500">Error</Badge>;
      case 'checking': return <Badge className="bg-blue-500">Checking</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const healthyCount = Object.values(checks).filter(c => c.status === 'healthy').length;
  const warningCount = Object.values(checks).filter(c => c.status === 'warning').length;
  const errorCount = Object.values(checks).filter(c => c.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Status & Stream Diagnostics</h1>
            <p className="text-slate-400 mt-2">
              Real-time monitoring and troubleshooting for Jericho Security System
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={connectWebSocket} 
              disabled={wsStatus === 'connecting'}
              variant="outline"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Reconnect WS
            </Button>
            <Button 
              onClick={runAllChecks} 
              disabled={isRefreshing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh All
            </Button>
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-500 text-sm font-medium">Healthy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{healthyCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-500 text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{warningCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-500 text-sm font-medium">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{errorCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-500 text-sm font-medium">Active Streams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{realTimeStats.activeStreams}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${wsStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                WebSocket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white capitalize">{wsStatus}</div>
            </CardContent>
          </Card>
        </div>

        {/* Camera Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {cameraStatuses.map(camera => (
            <Card key={camera.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">{camera.name}</CardTitle>
                  <Badge className={
                    camera.streamStatus === 'active' ? 'bg-green-500' :
                    camera.streamStatus === 'connecting' ? 'bg-yellow-500' :
                    camera.streamStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }>
                    {camera.streamStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Type: {camera.connectionType || 'none'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Last: {camera.lastActivity.toLocaleTimeString()}
                  </div>
                  {camera.errorMessage && (
                    <div className="text-xs text-red-400">{camera.errorMessage}</div>
                  )}
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      onClick={() => testCameraConnection(camera.id)}
                      className="text-xs px-2 py-1 h-6"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Test
                    </Button>
                    {camera.streamStatus === 'active' ? (
                      <Button 
                        size="sm" 
                        onClick={() => stopTestStream(camera.id)}
                        className="text-xs px-2 py-1 h-6 bg-red-600"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => startTestStream(camera.id)}
                        className="text-xs px-2 py-1 h-6 bg-green-600"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stream Logs */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <Terminal className="w-5 h-5 mr-2" />
                Live Stream Diagnostics
              </CardTitle>
              <Button 
                onClick={() => setStreamLogs([])}
                variant="outline"
                size="sm"
              >
                Clear Logs
              </Button>
            </div>
            <CardDescription className="text-slate-400">
              Real-time stream connection logs and troubleshooting information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto bg-slate-900 rounded p-4 font-mono text-sm">
              {streamLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  No stream logs yet. Start a camera stream to see diagnostic information.
                </div>
              ) : (
                streamLogs.map((log, index) => (
                  <div key={index} className="mb-1 flex items-start space-x-3">
                    <span className="text-slate-500 text-xs whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="text-slate-400 text-xs min-w-[60px]">
                      {log.cameraId > 0 ? `Cam${log.cameraId}` : 'SYS'}
                    </span>
                    <span className="text-slate-400 text-xs min-w-[80px]">
                      {log.action}
                    </span>
                    <span className={`text-xs ${getLogStatusColor(log.status)}`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-500 text-sm font-medium">Healthy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{healthyCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-500 text-sm font-medium">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{warningCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-500 text-sm font-medium">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{errorCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-500 text-sm font-medium">Total Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{Object.keys(checks).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Alert */}
        {errorCount > 0 && (
          <Alert className="border-red-500 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-400">System Issues Detected</AlertTitle>
            <AlertDescription className="text-red-300">
              {errorCount} critical issue{errorCount > 1 ? 's' : ''} found. 
              The backend server may need to be manually started: <code>sudo systemctl start jericho-backend</code>
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Troubleshooting Guide</CardTitle>
            <CardDescription className="text-slate-400">
              Common solutions for system issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-slate-300 space-y-2">
              <h4 className="font-semibold text-white">Backend Server Not Running:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li><code>sudo systemctl status jericho-backend</code> - Check service status</li>
                <li><code>sudo systemctl start jericho-backend</code> - Start the service</li>
                <li><code>sudo systemctl enable jericho-backend</code> - Enable auto-start</li>
                <li><code>sudo journalctl -u jericho-backend -f</code> - View service logs</li>
              </ul>
            </div>
            
            <div className="text-slate-300 space-y-2">
              <h4 className="font-semibold text-white">WebSocket Connection Issues:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>Check if Nginx is running: <code>sudo systemctl status nginx</code></li>
                <li>Verify firewall allows HTTPS: <code>sudo ufw status</code></li>
                <li>Check SSL certificate validity</li>
              </ul>
            </div>

            <div className="text-slate-300 space-y-2">
              <h4 className="font-semibold text-white">Manual Backend Start:</h4>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li><code>cd /opt/jericho/backend && npm start</code> - Manual start</li>
                <li>Check for port conflicts on 3001</li>
                <li>Verify FFmpeg is installed: <code>ffmpeg -version</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Status;
