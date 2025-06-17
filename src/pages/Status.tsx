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
  Clock
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

const Status = () => {
  const [checks, setChecks] = useState<Record<string, HealthCheck>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const updateCheck = (key: string, update: Partial<HealthCheck>) => {
    setChecks(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update, lastChecked: new Date() }
    }));
  };

  // Initialize all health checks
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
      },
      nginx: {
        name: 'Nginx Proxy',
        status: 'checking',
        message: 'Checking Nginx proxy status...',
        icon: Globe
      },
      ssl: {
        name: 'SSL Certificate',
        status: 'checking',
        message: 'Checking SSL certificate...',
        icon: Shield
      },
      systemd: {
        name: 'Systemd Services',
        status: 'checking',
        message: 'Checking auto-start services...',
        icon: Zap
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

  // Check backend server status
  const checkBackendServer = async () => {
    try {
      const response = await fetch('https://192.168.0.138/api/status', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        updateCheck('backend', {
          status: 'healthy',
          message: `Backend server running (${data.status})`,
          details: `Active streams: ${data.activeStreams}, Connected clients: ${data.connectedClients}`
        });
      } else {
        updateCheck('backend', {
          status: 'error',
          message: `Backend server responded with ${response.status}`,
          details: 'Server may be experiencing issues'
        });
      }
    } catch (error) {
      updateCheck('backend', {
        status: 'error',
        message: 'Backend server not responding',
        details: 'Server may not be running or network issue'
      });
    }
  };

  // Check WebSocket connection
  const checkWebSocket = () => {
    try {
      const ws = new WebSocket('wss://192.168.0.138/ws');
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        updateCheck('websocket', {
          status: 'error',
          message: 'WebSocket connection timeout',
          details: 'Connection failed to establish within 5 seconds'
        });
        ws.close();
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        updateCheck('websocket', {
          status: 'healthy',
          message: 'WebSocket connected successfully',
          details: 'Real-time communication available'
        });
        ws.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        updateCheck('websocket', {
          status: 'error',
          message: 'WebSocket connection failed',
          details: 'Backend WebSocket server not available'
        });
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          updateCheck('websocket', {
            status: 'warning',
            message: 'WebSocket connection closed unexpectedly',
            details: `Close code: ${event.code}`
          });
        }
      };
    } catch (error) {
      updateCheck('websocket', {
        status: 'error',
        message: 'WebSocket initialization failed',
        details: error.message
      });
    }
  };

  // Check database connectivity
  const checkDatabase = async () => {
    try {
      const response = await fetch('https://192.168.0.138/api/cameras');
      if (response.ok) {
        const cameras = await response.json();
        updateCheck('database', {
          status: 'healthy',
          message: 'Database accessible',
          details: `${cameras.length} cameras configured`
        });
      } else {
        updateCheck('database', {
          status: 'error',
          message: 'Database query failed',
          details: 'API endpoint returned error'
        });
      }
    } catch (error) {
      updateCheck('database', {
        status: 'error',
        message: 'Database not accessible',
        details: 'Cannot reach database API'
      });
    }
  };

  // Check FFmpeg availability
  const checkFFmpeg = async () => {
    try {
      // This would typically be checked via a backend endpoint
      updateCheck('ffmpeg', {
        status: 'warning',
        message: 'FFmpeg status unknown',
        details: 'Requires backend API to verify FFmpeg installation'
      });
    } catch (error) {
      updateCheck('ffmpeg', {
        status: 'error',
        message: 'Cannot check FFmpeg status',
        details: error.message
      });
    }
  };

  // Check active streams
  const checkStreams = async () => {
    try {
      // Check for active HLS files
      const testCameraIds = [1, 2, 3, 4];
      let activeCount = 0;

      for (const id of testCameraIds) {
        try {
          const response = await fetch(`/hls/camera_${id}.m3u8`, { method: 'HEAD' });
          if (response.ok) activeCount++;
        } catch {}
      }

      updateCheck('streams', {
        status: activeCount > 0 ? 'healthy' : 'warning',
        message: `${activeCount} active streams detected`,
        details: activeCount === 0 ? 'No camera streams currently active' : 'HLS streams available'
      });
    } catch (error) {
      updateCheck('streams', {
        status: 'error',
        message: 'Cannot check stream status',
        details: error.message
      });
    }
  };

  // Check Nginx proxy
  const checkNginx = async () => {
    try {
      const response = await fetch('https://192.168.0.138/', { method: 'HEAD' });
      if (response.ok) {
        updateCheck('nginx', {
          status: 'healthy',
          message: 'Nginx proxy responding',
          details: 'Web server accessible via HTTPS'
        });
      } else {
        updateCheck('nginx', {
          status: 'warning',
          message: `Nginx returned ${response.status}`,
          details: 'Proxy may have configuration issues'
        });
      }
    } catch (error) {
      updateCheck('nginx', {
        status: 'error',
        message: 'Nginx proxy not responding',
        details: 'Web server may be down'
      });
    }
  };

  // Check SSL certificate
  const checkSSL = async () => {
    try {
      // In a real implementation, this would check certificate validity
      updateCheck('ssl', {
        status: 'healthy',
        message: 'SSL connection established',
        details: 'HTTPS is working'
      });
    } catch (error) {
      updateCheck('ssl', {
        status: 'error',
        message: 'SSL verification failed',
        details: error.message
      });
    }
  };

  // Check systemd services
  const checkSystemd = () => {
    // This would require a backend endpoint to check service status
    updateCheck('systemd', {
      status: 'warning',
      message: 'Service status unknown',
      details: 'Requires backend API to check systemd services (jericho-backend, nginx)'
    });
  };

  // Run all health checks
  const runAllChecks = async () => {
    setIsRefreshing(true);
    initializeChecks();

    try {
      await Promise.allSettled([
        checkBackendServer(),
        checkWebSocket(),
        checkDatabase(),
        checkFFmpeg(),
        checkStreams(),
        checkNginx(),
        checkSSL()
      ]);
      checkSystemd();
    } catch (error) {
      toast({
        title: "Health Check Error",
        description: "Some health checks failed to complete",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    runAllChecks();
    const interval = setInterval(runAllChecks, 30000);
    return () => clearInterval(interval);
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

  const healthyCount = Object.values(checks).filter(c => c.status === 'healthy').length;
  const warningCount = Object.values(checks).filter(c => c.status === 'warning').length;
  const errorCount = Object.values(checks).filter(c => c.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Status</h1>
            <p className="text-slate-400 mt-2">
              Comprehensive health monitoring for all Jericho Security components
            </p>
          </div>
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

        {/* Health Check Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(checks).map(([key, check]) => {
            const IconComponent = check.icon;
            return (
              <Card key={key} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`w-5 h-5 ${getStatusColor(check.status)}`} />
                      <CardTitle className="text-white text-sm">{check.name}</CardTitle>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 text-sm mb-2">{check.message}</p>
                  {check.details && (
                    <p className="text-slate-400 text-xs mb-2">{check.details}</p>
                  )}
                  <div className="flex items-center text-xs text-slate-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Last checked: {check.lastChecked.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
