import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Video, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Play,
  Square,
  Server,
  Terminal
} from 'lucide-react';
import { getJSMpegUrl, getBackendConfig } from '@/config/environment';

interface StreamDiagnostic {
  cameraId: number;
  wsUrl: string;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  lastError?: string;
  connectionAttempts: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  logs: string[];
}

interface BackendHealth {
  apiReachable: boolean;
  wsReachable: boolean;
  jsmpegEndpointExists: boolean;
  lastChecked: Date;
  errors: string[];
}

export const RTSPStreamDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<Record<number, StreamDiagnostic>>({});
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    apiReachable: false,
    wsReachable: false,
    jsmpegEndpointExists: false,
    lastChecked: new Date(),
    errors: []
  });
  const wsRefs = useRef<Record<number, WebSocket>>({});

  const addLog = (cameraId: number, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] Camera ${cameraId}: ${message}`;
    
    setDiagnostics(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        logs: [...(prev[cameraId]?.logs || []), logMessage].slice(-50)
      }
    }));
    
    setGlobalLogs(prev => [...prev, logMessage].slice(-100));
  };

  const addGlobalLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setGlobalLogs(prev => [...prev, logMessage].slice(-100));
  };

  const checkBackendHealth = async () => {
    const backend = getBackendConfig();
    const errors: string[] = [];
    let apiReachable = false;
    let wsReachable = false;
    let jsmpegEndpointExists = false;

    addGlobalLog('Checking backend health...');

    // Check API endpoint
    try {
      const response = await fetch(`${backend.apiUrl}/status`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      });
      apiReachable = response.ok;
      if (!response.ok) {
        errors.push(`API returned ${response.status}`);
      }
    } catch (error: any) {
      errors.push(`API unreachable: ${error.message}`);
    }

    // Check WebSocket endpoint
    try {
      const ws = new WebSocket(backend.wsUrl);
      const wsPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
      
      wsReachable = await wsPromise as boolean;
      if (!wsReachable) {
        errors.push('Main WebSocket endpoint unreachable');
      }
    } catch (error: any) {
      errors.push(`WebSocket test failed: ${error.message}`);
    }

    // Check if JSMpeg endpoint exists by testing camera 1
    try {
      const jsmpegWs = new WebSocket(getJSMpegUrl(1));
      const jsmpegPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          jsmpegWs.close();
          resolve(false);
        }, 3000);

        jsmpegWs.onopen = () => {
          clearTimeout(timeout);
          jsmpegWs.close();
          resolve(true);
        };

        jsmpegWs.onclose = (event) => {
          clearTimeout(timeout);
          // Code 1006 means server closed connection, but endpoint exists
          resolve(event.code === 1006 || event.code === 1000);
        };

        jsmpegWs.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
      
      jsmpegEndpointExists = await jsmpegPromise as boolean;
      if (!jsmpegEndpointExists) {
        errors.push('JSMpeg WebSocket endpoint not responding');
      }
    } catch (error: any) {
      errors.push(`JSMpeg endpoint test failed: ${error.message}`);
    }

    setBackendHealth({
      apiReachable,
      wsReachable,
      jsmpegEndpointExists,
      lastChecked: new Date(),
      errors
    });

    addGlobalLog(`Backend health check complete: API=${apiReachable}, WS=${wsReachable}, JSMpeg=${jsmpegEndpointExists}`);
  };

  const updateDiagnostic = (cameraId: number, updates: Partial<StreamDiagnostic>) => {
    setDiagnostics(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        cameraId,
        wsUrl: getJSMpegUrl(cameraId),
        logs: [],
        connectionAttempts: 0,
        status: 'idle',
        ...updates
      }
    }));
  };

  const testConnection = (cameraId: number) => {
    const existing = wsRefs.current[cameraId];
    if (existing) {
      existing.close();
      delete wsRefs.current[cameraId];
    }

    const wsUrl = getJSMpegUrl(cameraId);
    updateDiagnostic(cameraId, { 
      status: 'connecting',
      connectionAttempts: (diagnostics[cameraId]?.connectionAttempts || 0) + 1
    });
    
    addLog(cameraId, `Attempting connection to ${wsUrl}`);
    addGlobalLog(`Testing connection for Camera ${cameraId}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRefs.current[cameraId] = ws;

      const timeout = setTimeout(() => {
        addLog(cameraId, 'Connection timeout (5s)');
        updateDiagnostic(cameraId, { 
          status: 'error', 
          lastError: 'Connection timeout',
          lastDisconnected: new Date()
        });
        ws.close();
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        addLog(cameraId, 'WebSocket connected successfully');
        updateDiagnostic(cameraId, { 
          status: 'connected',
          lastConnected: new Date(),
          lastError: undefined
        });
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        const closeReason = event.code === 1006 ? 'abnormal closure - server may be down' : 
                           event.code === 1000 ? 'normal closure' :
                           `code ${event.code}`;
        addLog(cameraId, `WebSocket closed: ${closeReason}, reason="${event.reason}"`);
        updateDiagnostic(cameraId, { 
          status: 'error',
          lastError: `Connection closed (${closeReason})`,
          lastDisconnected: new Date()
        });
        delete wsRefs.current[cameraId];
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        addLog(cameraId, `WebSocket error: ${error.toString()}`);
        updateDiagnostic(cameraId, { 
          status: 'error',
          lastError: 'WebSocket connection error',
          lastDisconnected: new Date()
        });
      };

      ws.onmessage = (event) => {
        addLog(cameraId, `Received data: ${event.data?.length || 0} bytes`);
      };

    } catch (error: any) {
      addLog(cameraId, `Connection failed: ${error.message}`);
      updateDiagnostic(cameraId, { 
        status: 'error',
        lastError: error.message,
        lastDisconnected: new Date()
      });
    }
  };

  const stopConnection = (cameraId: number) => {
    const ws = wsRefs.current[cameraId];
    if (ws) {
      ws.close();
      delete wsRefs.current[cameraId];
      addLog(cameraId, 'Connection stopped manually');
      updateDiagnostic(cameraId, { status: 'idle' });
    }
  };

  const clearLogs = () => {
    setGlobalLogs([]);
    setDiagnostics(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[parseInt(key)].logs = [];
      });
      return updated;
    });
    addGlobalLog('Logs cleared');
  };

  // Initialize diagnostics for cameras 1-4
  useEffect(() => {
    [1, 2, 3, 4].forEach(cameraId => {
      updateDiagnostic(cameraId, {});
    });
    addGlobalLog('RTSP Stream Diagnostics initialized');
    checkBackendHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected': return <Badge className="bg-green-500">Connected</Badge>;
      case 'connecting': return <Badge className="bg-blue-500">Connecting</Badge>;
      case 'error': return <Badge className="bg-red-500">Error</Badge>;
      default: return <Badge className="bg-gray-500">Idle</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">RTSP Stream Diagnostics</h2>
          <p className="text-slate-400">Real-time WebSocket connection testing for JSMpeg streams</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={checkBackendHealth} variant="outline" size="sm">
            <Server className="w-4 h-4 mr-2" />
            Check Backend
          </Button>
          <Button onClick={clearLogs} variant="outline" size="sm">
            <Terminal className="w-4 h-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Backend Health Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Server className="w-5 h-5 mr-2" />
            Backend Health Status
          </CardTitle>
          <CardDescription className="text-slate-400">
            Last checked: {backendHealth.lastChecked.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              {backendHealth.apiReachable ? 
                <CheckCircle className="w-4 h-4 text-green-500" /> : 
                <XCircle className="w-4 h-4 text-red-500" />
              }
              <span className="text-sm text-slate-300">API Server ({getBackendConfig().apiUrl})</span>
            </div>
            <div className="flex items-center space-x-2">
              {backendHealth.wsReachable ? 
                <CheckCircle className="w-4 h-4 text-green-500" /> : 
                <XCircle className="w-4 h-4 text-red-500" />
              }
              <span className="text-sm text-slate-300">WebSocket Server</span>
            </div>
            <div className="flex items-center space-x-2">
              {backendHealth.jsmpegEndpointExists ? 
                <CheckCircle className="w-4 h-4 text-green-500" /> : 
                <XCircle className="w-4 h-4 text-red-500" />
              }
              <span className="text-sm text-slate-300">JSMpeg Endpoint</span>
            </div>
          </div>
          
          {backendHealth.errors.length > 0 && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-red-400">Backend Issues Detected</AlertTitle>
              <AlertDescription className="text-red-300">
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {backendHealth.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                <div className="mt-3 text-sm">
                  <strong>Quick Fix:</strong> Try running: <code className="bg-slate-800 px-1 rounded">sudo systemctl start jericho-backend</code>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Camera Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(diagnostics).map((diag) => (
          <Card key={diag.cameraId} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-white">Camera {diag.cameraId}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(diag.status)}
                  {getStatusBadge(diag.status)}
                </div>
              </div>
              <CardDescription className="text-slate-400">
                {diag.wsUrl}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Controls */}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => testConnection(diag.cameraId)}
                  disabled={diag.status === 'connecting'}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => stopConnection(diag.cameraId)}
                  disabled={diag.status === 'idle'}
                  variant="outline"
                  size="sm"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>

              {/* Connection Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Attempts:</span>
                  <span className="text-white ml-1">{diag.connectionAttempts}</span>
                </div>
                <div>
                  <span className="text-slate-400">Last Error:</span>
                  <span className="text-red-400 ml-1">{diag.lastError || 'None'}</span>
                </div>
              </div>

              {/* Recent Logs */}
              <div className="max-h-32 overflow-y-auto">
                <h4 className="text-xs font-semibold text-slate-300 mb-1">Recent Logs:</h4>
                <pre className="text-xs bg-slate-900 p-2 rounded whitespace-pre-wrap">
                  {diag.logs.slice(-5).join('\n') || 'No logs yet'}
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global Logs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Global Stream Logs</CardTitle>
          <CardDescription className="text-slate-400">
            All stream connection events and diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono bg-slate-900 p-3 rounded whitespace-pre-wrap">
              {globalLogs.join('\n') || 'No logs available'}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Guide */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Common Solutions for Error Code 1006</CardTitle>
          <CardDescription className="text-slate-400">
            WebSocket abnormal closure troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-slate-300 space-y-2">
            <h4 className="font-semibold text-white">1. Backend Server Not Running:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li><code>sudo systemctl status jericho-backend</code> - Check service status</li>
              <li><code>sudo systemctl start jericho-backend</code> - Start the service</li>
              <li><code>sudo systemctl enable jericho-backend</code> - Enable auto-start</li>
            </ul>
          </div>
          
          <div className="text-slate-300 space-y-2">
            <h4 className="font-semibold text-white">2. Port 3001 Issues:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li><code>sudo netstat -tlnp | grep 3001</code> - Check if port is in use</li>
              <li><code>sudo ufw allow 3001</code> - Allow port through firewall</li>
              <li>Verify no other process is using port 3001</li>
            </ul>
          </div>

          <div className="text-slate-300 space-y-2">
            <h4 className="font-semibold text-white">3. Manual Backend Start:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li><code>cd /opt/jericho/backend && npm start</code> - Manual start</li>
              <li>Check console output for errors</li>
              <li>Verify cameras are configured in database</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
