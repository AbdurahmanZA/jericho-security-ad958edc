
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Play,
  Square
} from 'lucide-react';
import { getJSMpegUrl } from '@/config/environment';

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

export const RTSPStreamDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<Record<number, StreamDiagnostic>>({});
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const wsRefs = useRef<Record<number, WebSocket>>({});

  const addLog = (cameraId: number, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] Camera ${cameraId}: ${message}`;
    
    setDiagnostics(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        logs: [...(prev[cameraId]?.logs || []), logMessage].slice(-50) // Keep last 50 logs
      }
    }));
    
    setGlobalLogs(prev => [...prev, logMessage].slice(-100)); // Keep last 100 global logs
  };

  const addGlobalLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setGlobalLogs(prev => [...prev, logMessage].slice(-100));
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
        addLog(cameraId, `WebSocket closed: code=${event.code}, reason="${event.reason}"`);
        updateDiagnostic(cameraId, { 
          status: 'error',
          lastError: `Connection closed (${event.code})`,
          lastDisconnected: new Date()
        });
        delete wsRefs.current[cameraId];
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        addLog(cameraId, `WebSocket error: ${error}`);
        updateDiagnostic(cameraId, { 
          status: 'error',
          lastError: 'WebSocket error',
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
        <Button onClick={clearLogs} variant="outline" size="sm">
          Clear All Logs
        </Button>
      </div>

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
    </div>
  );
};
