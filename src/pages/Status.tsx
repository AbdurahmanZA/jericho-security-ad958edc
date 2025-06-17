import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Terminal,
  Key,
  Bug,
  TestTube
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
  const [apiLogs, setApiLogs] = useState<StreamLog[]>([]);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
  const [wsLastError, setWsLastError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState({
    responsive: false,
    lastCheck: new Date(),
    responseTime: 0
  });
  const [rtspTestUrl, setRtspTestUrl] = useState('');
  const [rtspTestResults, setRtspTestResults] = useState<any[]>([]);
  const [isTestingRtsp, setIsTestingRtsp] = useState(false);
  
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

  const addApiLog = (action: string, status: 'info' | 'success' | 'warning' | 'error', message: string, details?: any) => {
    const newLog: StreamLog = {
      timestamp: new Date(),
      cameraId: 0,
      action,
      status,
      message: details ? `${message} - ${JSON.stringify(details)}` : message
    };
    
    setApiLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50); // Keep last 50 API logs
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

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setWsStatus('connecting');
    addStreamLog(0, 'websocket', 'info', `Attempting WebSocket connection (attempt ${wsReconnectAttempts + 1})...`);
    addApiLog('websocket_connect', 'info', 'Starting WebSocket connection', { attempt: wsReconnectAttempts + 1 });
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          setWsLastError('Connection timeout after 10 seconds');
          addApiLog('websocket_error', 'error', 'WebSocket connection timeout');
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        setWsStatus('connected');
        setWsReconnectAttempts(0);
        setWsLastError(null);
        addStreamLog(0, 'websocket', 'success', 'WebSocket monitoring connected successfully');
        addApiLog('websocket_open', 'success', 'WebSocket connection established', { url: wsUrl });
        
        ws.send(JSON.stringify({ type: 'monitor_ping', timestamp: Date.now() }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          addStreamLog(0, 'websocket_msg', 'info', `Received: ${data.type}${data.cameraId ? ` (Camera ${data.cameraId})` : ''}`);
          addApiLog('websocket_message', 'info', `Received message: ${data.type}`, data);
          
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
          
          if (data.activeStreams !== undefined) {
            setRealTimeStats(prev => ({
              ...prev,
              activeStreams: data.activeStreams,
              lastUpdate: new Date()
            }));
          }
        } catch (error) {
          addStreamLog(0, 'websocket_error', 'error', `Failed to parse WebSocket message: ${error}`);
          addApiLog('websocket_parse_error', 'error', 'Failed to parse WebSocket message', { error: error.message, data: event.data });
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setWsStatus('disconnected');
        const closeReasons = {
          1000: 'Normal closure',
          1001: 'Endpoint going away',
          1002: 'Protocol error',
          1003: 'Unsupported data type',
          1006: 'Abnormal closure (network/server issue)',
          1007: 'Invalid data',
          1008: 'Policy violation',
          1009: 'Message too large',
          1010: 'Extension expected',
          1011: 'Server error',
          1015: 'TLS handshake failure'
        };
        
        const reason = closeReasons[event.code] || `Unknown (${event.code})`;
        setWsLastError(`${reason} - Code: ${event.code}`);
        
        addStreamLog(0, 'websocket', 'warning', `WebSocket disconnected: ${reason} (code: ${event.code})`);
        addApiLog('websocket_close', 'warning', 'WebSocket connection closed', { 
          code: event.code, 
          reason,
          wasClean: event.wasClean,
          attempt: wsReconnectAttempts 
        });
        
        const backoffDelay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
        setWsReconnectAttempts(prev => prev + 1);
        
        setTimeout(() => {
          if (wsReconnectAttempts < 10) {
            connectWebSocket();
          } else {
            addApiLog('websocket_reconnect_failed', 'error', 'Max reconnection attempts reached');
          }
        }, backoffDelay);
      };

      ws.onerror = (error) => {
        setWsStatus('error');
        setWsLastError('WebSocket error occurred');
        addStreamLog(0, 'websocket', 'error', 'WebSocket connection error');
        addApiLog('websocket_error', 'error', 'WebSocket error occurred', { error });
      };

    } catch (error) {
      setWsStatus('error');
      setWsLastError(`Setup failed: ${error.message}`);
      addStreamLog(0, 'websocket', 'error', `WebSocket setup failed: ${error}`);
      addApiLog('websocket_setup_error', 'error', 'WebSocket setup failed', { error: error.message });
    }
  };

  const testCameraConnection = async (cameraId: number) => {
    addStreamLog(cameraId, 'test_start', 'info', 'Starting connection test...');
    updateCameraStatus(cameraId, { streamStatus: 'connecting' });

    try {
      const statusResponse = await fetch(`/api/streams/${cameraId}/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        addStreamLog(cameraId, 'test_status', 'success', `Stream status: ${statusData.status}`);
        updateCameraStatus(cameraId, { streamStatus: statusData.status === 'running' ? 'active' : 'stopped' });
      } else {
        addStreamLog(cameraId, 'test_status', 'error', `Status check failed: ${statusResponse.status}`);
      }

      const webrtcResponse = await fetch(`/api/webrtc/streams/${cameraId}/status`);
      if (webrtcResponse.ok) {
        const webrtcData = await webrtcResponse.json();
        addStreamLog(cameraId, 'test_webrtc', webrtcData.webrtc_available ? 'success' : 'warning', 
          `WebRTC ${webrtcData.webrtc_available ? 'available' : 'not available'}`);
      }

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

  const checkBackendHealth = async () => {
    const startTime = Date.now();
    addApiLog('backend_health', 'info', 'Starting backend health check');
    
    try {
      const response = await fetch('/api/status', { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setBackendHealth({
          responsive: true,
          lastCheck: new Date(),
          responseTime
        });
        
        addApiLog('backend_health', 'success', 'Backend health check passed', {
          responseTime: `${responseTime}ms`,
          status: data.status,
          activeStreams: data.activeStreams
        });
        
        updateCheck('backend', {
          status: 'healthy',
          message: `Backend server running (${data.status})`,
          details: `Response time: ${responseTime}ms, Active streams: ${data.activeStreams}, Connected clients: ${data.connectedClients}`
        });
        
        setRealTimeStats(prev => ({
          ...prev,
          activeStreams: data.activeStreams,
          connectedClients: data.connectedClients,
          lastUpdate: new Date()
        }));
        
        addStreamLog(0, 'backend_check', 'success', `Backend healthy - ${data.activeStreams} active streams, ${responseTime}ms response`);
      } else {
        setBackendHealth({
          responsive: false,
          lastCheck: new Date(),
          responseTime
        });
        
        addApiLog('backend_health', 'error', 'Backend health check failed', {
          status: response.status,
          statusText: response.statusText,
          responseTime: `${responseTime}ms`
        });
        
        updateCheck('backend', {
          status: 'error',
          message: `Backend server responded with ${response.status}`,
          details: `${response.statusText} (${responseTime}ms)`
        });
        addStreamLog(0, 'backend_check', 'error', `Backend responded with status ${response.status} in ${responseTime}ms`);
      }
    } catch (error) {
      setBackendHealth({
        responsive: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime
      });
      
      addApiLog('backend_health', 'error', 'Backend health check failed', {
        error: error.message,
        type: error.name,
        responseTime: `${Date.now() - startTime}ms`
      });
      
      updateCheck('backend', {
        status: 'error',
        message: 'Backend server not responding',
        details: `Error: ${error.message}`
      });
      addStreamLog(0, 'backend_check', 'error', `Backend check failed: ${error.message}`);
    }
  };

  const checkDatabase = async () => {
    addApiLog('database_health', 'info', 'Checking database connectivity');
    
    try {
      const response = await fetch('/api/health/database');
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        updateCheck('database', {
          status: 'healthy',
          message: 'SQLite database connected',
          details: 'Database queries responding normally'
        });
        addApiLog('database_health', 'success', 'Database health check passed');
      } else {
        updateCheck('database', {
          status: 'error',
          message: 'Database connection failed',
          details: data.error || 'Unknown database error'
        });
        addApiLog('database_health', 'error', 'Database health check failed', data);
      }
    } catch (error) {
      updateCheck('database', {
        status: 'error',
        message: 'Database health check failed',
        details: `Error: ${error.message}`
      });
      addApiLog('database_health', 'error', 'Database health check failed', { error: error.message });
    }
  };

  const checkFFmpeg = async () => {
    addApiLog('ffmpeg_health', 'info', 'Checking FFmpeg availability');
    
    try {
      const response = await fetch('/api/health/ffmpeg');
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        updateCheck('ffmpeg', {
          status: 'healthy',
          message: `FFmpeg available (${data.version})`,
          details: 'Video processing capabilities ready'
        });
        addApiLog('ffmpeg_health', 'success', 'FFmpeg health check passed', { version: data.version });
      } else {
        updateCheck('ffmpeg', {
          status: 'error',
          message: 'FFmpeg not available',
          details: data.error || 'FFmpeg installation required'
        });
        addApiLog('ffmpeg_health', 'error', 'FFmpeg health check failed', data);
      }
    } catch (error) {
      updateCheck('ffmpeg', {
        status: 'error',
        message: 'FFmpeg health check failed',
        details: `Error: ${error.message}`
      });
      addApiLog('ffmpeg_health', 'error', 'FFmpeg health check failed', { error: error.message });
    }
  };

  const checkStreams = async () => {
    addApiLog('streams_health', 'info', 'Checking stream status');
    
    try {
      const response = await fetch('/api/health/streams');
      const data = await response.json();
      
      if (response.ok && data.status === 'healthy') {
        updateCheck('streams', {
          status: data.activeStreams > 0 ? 'healthy' : 'warning',
          message: `${data.activeStreams} active of ${data.totalConfigured} configured`,
          details: `Active streams: ${data.activeStreams}, Total configured: ${data.totalConfigured}`
        });
        addApiLog('streams_health', 'success', 'Stream status check passed', {
          active: data.activeStreams,
          total: data.totalConfigured
        });
      } else {
        updateCheck('streams', {
          status: 'error',
          message: 'Stream status check failed',
          details: data.error || 'Unable to query stream status'
        });
        addApiLog('streams_health', 'error', 'Stream status check failed', data);
      }
    } catch (error) {
      updateCheck('streams', {
        status: 'error',
        message: 'Stream status check failed',
        details: `Error: ${error.message}`
      });
      addApiLog('streams_health', 'error', 'Stream status check failed', { error: error.message });
    }
  };

  const testRtspConnection = async (url?: string) => {
    const testUrl = url || rtspTestUrl;
    if (!testUrl) {
      toast({
        title: "RTSP URL Required",
        description: "Please enter an RTSP URL to test",
        variant: "destructive"
      });
      return;
    }

    setIsTestingRtsp(true);
    addApiLog('rtsp_test', 'info', `Testing RTSP connection to: ${testUrl}`);
    
    try {
      console.log('Making RTSP test request to:', '/api/health/test-rtsp');
      console.log('Request payload:', { url: testUrl });
      
      const response = await fetch('/api/health/test-rtsp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: testUrl })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        
        addApiLog('rtsp_test', 'error', `Server returned non-JSON response`, {
          status: response.status,
          contentType,
          response: textResponse.substring(0, 200) + '...'
        });
        
        toast({
          title: "API Error",
          description: `Server returned HTML instead of JSON. Status: ${response.status}`,
          variant: "destructive"
        });
        return;
      }
      
      const data = await response.json();
      
      const result = {
        timestamp: new Date(),
        url: testUrl,
        status: data.status,
        message: data.message,
        details: data.streams || data.error,
        responseTime: Date.now()
      };
      
      setRtspTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (data.status === 'success') {
        addApiLog('rtsp_test', 'success', `RTSP test passed: ${data.message}`, {
          url: testUrl,
          streams: data.streams?.length || 0
        });
        
        toast({
          title: "RTSP Test Successful",
          description: `Connection to ${testUrl} successful`,
        });
      } else {
        addApiLog('rtsp_test', 'error', `RTSP test failed: ${data.message}`, {
          url: testUrl,
          error: data.error
        });
        
        toast({
          title: "RTSP Test Failed",
          description: data.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('RTSP test request failed:', error);
      
      const result = {
        timestamp: new Date(),
        url: testUrl,
        status: 'error',
        message: `Request failed: ${error.message}`,
        details: null,
        responseTime: Date.now()
      };
      
      setRtspTestResults(prev => [result, ...prev.slice(0, 9)]);
      addApiLog('rtsp_test', 'error', `RTSP test request failed: ${error.message}`, { url: testUrl });
      
      toast({
        title: "RTSP Test Error",
        description: `Request failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsTestingRtsp(false);
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
        checkBackendHealth(),
        checkDatabase(),
        checkFFmpeg(),
        checkStreams()
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

  const testApiCredentials = async (appKey: string, appSecret: string) => {
    addApiLog('credentials_test', 'info', 'Testing Hikvision API credentials');
    
    try {
      const response = await fetch('https://open.ys7.com/api/lapp/token/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          appKey,
          appSecret,
        }),
      });

      const result = await response.json();
      
      if (result.code === '200') {
        addApiLog('credentials_test', 'success', 'API credentials are valid', {
          accessToken: result.data.accessToken ? 'Received' : 'Not received',
          expireTime: result.data.expireTime
        });
        return { success: true, data: result.data };
      } else {
        addApiLog('credentials_test', 'error', 'API credentials test failed', {
          code: result.code,
          message: result.msg
        });
        return { success: false, error: result.msg };
      }
    } catch (error) {
      addApiLog('credentials_test', 'error', 'API credentials test failed', {
        error: error.message,
        type: error.name
      });
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    loadCameraConfig();
    connectWebSocket();
    runAllChecks();

    const interval = setInterval(() => {
      checkBackendHealth();
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
              onClick={() => {
                setWsReconnectAttempts(0);
                setWsLastError(null);
                connectWebSocket();
              }} 
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
            <Button 
              onClick={async () => {
                try {
                  const testResponse = await fetch('/api/test');
                  const testData = await testResponse.json();
                  console.log('API test response:', testData);
                  addApiLog('api_test', 'success', 'API test endpoint working', testData);
                } catch (error) {
                  console.error('API test failed:', error);
                  addApiLog('api_test', 'error', 'API test failed', { error: error.message });
                }
              }}
              variant="outline"
              size="sm"
            >
              Test API
            </Button>
          </div>
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

        {/* WebSocket Status Alert */}
        {wsStatus !== 'connected' && (
          <Alert className="border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-yellow-400">WebSocket Connection Issue</AlertTitle>
            <AlertDescription className="text-yellow-300">
              {wsLastError && <div className="mb-2">Error: {wsLastError}</div>}
              <div>Reconnect attempts: {wsReconnectAttempts}/10</div>
              {wsReconnectAttempts >= 10 && (
                <div className="text-red-400 mt-2">
                  Max reconnection attempts reached. Check if the backend server is running.
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Service Health Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(checks).map(([key, check]) => {
            const IconComponent = check.icon;
            return (
              <Card key={key} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`w-5 h-5 ${getStatusColor(check.status)}`} />
                      <CardTitle className="text-white text-lg">{check.name}</CardTitle>
                    </div>
                    {getStatusBadge(check.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-slate-300 text-sm">{check.message}</p>
                    {check.details && (
                      <p className="text-slate-400 text-xs">{check.details}</p>
                    )}
                    <div className="text-slate-500 text-xs">
                      Last checked: {check.lastChecked.toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-500 text-sm font-medium">Healthy Services</CardTitle>
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

        {/* API Credentials Troubleshooting */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <Key className="w-5 h-5 mr-2" />
                API Credentials & Authentication
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => {
                    const appKey = prompt('Enter App Key:');
                    const appSecret = prompt('Enter App Secret:');
                    if (appKey && appSecret) {
                      testApiCredentials(appKey, appSecret);
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Test Credentials
                </Button>
                <Button 
                  onClick={() => setApiLogs([])}
                  variant="outline"
                  size="sm"
                >
                  Clear Logs
                </Button>
              </div>
            </div>
            <CardDescription className="text-slate-400">
              Debug information for Hikvision API credentials and authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto bg-slate-900 rounded p-4 font-mono text-sm">
              {apiLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  No API logs yet. Click "Test Credentials" to verify your Hikvision App Key and Secret.
                </div>
              ) : (
                apiLogs.map((log, index) => (
                  <div key={index} className="mb-1 flex items-start space-x-3">
                    <span className="text-slate-500 text-xs whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="text-slate-400 text-xs min-w-[100px]">
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

        {/* RTSP Connection Tester */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <TestTube className="w-5 h-5 mr-2" />
                RTSP Connection Tester
              </CardTitle>
              <Button 
                onClick={() => setRtspTestResults([])}
                variant="outline"
                size="sm"
              >
                Clear Results
              </Button>
            </div>
            <CardDescription className="text-slate-400">
              Test RTSP stream connectivity before adding to cameras. Debug API connectivity issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor="rtspUrl" className="text-slate-300">RTSP URL</Label>
                <Input
                  id="rtspUrl"
                  value={rtspTestUrl}
                  onChange={(e) => setRtspTestUrl(e.target.value)}
                  placeholder="rtsp://username:password@192.168.1.100:554/stream"
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => testRtspConnection()}
                  disabled={isTestingRtsp || !rtspTestUrl}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isTestingRtsp ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </div>
            
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testRtspConnection('rtsp://hass:Mickeyishome@192.168.0.4:10554/Streaming/Channels/102')}
                disabled={isTestingRtsp}
              >
                Test Your Camera
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => testRtspConnection('rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4')}
                disabled={isTestingRtsp}
              >
                Test Demo Stream
              </Button>
            </div>

            {/* Debug Section */}
            <div className="bg-slate-900 rounded p-3">
              <h5 className="text-slate-300 font-semibold mb-2">Debug Information</h5>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Backend Health Endpoint: <code>/api/health/test-rtsp</code></div>
                <div>Expected Content-Type: <code>application/json</code></div>
                <div>If you see HTML/DOCTYPE errors, the backend route is not properly mounted</div>
              </div>
            </div>

            {rtspTestResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-semibold">Test Results</h4>
                <div className="h-64 overflow-y-auto bg-slate-900 rounded p-4 space-y-2">
                  {rtspTestResults.map((result, index) => (
                    <div key={index} className="border-b border-slate-700 pb-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${
                          result.status === 'success' ? 'text-green-400' :
                          result.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {result.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{result.url}</div>
                      <div className="text-xs text-slate-300">{result.message}</div>
                      {result.details && (
                        <div className="text-xs text-slate-500 mt-1">
                          {typeof result.details === 'object' ? 
                            JSON.stringify(result.details, null, 2) : 
                            result.details
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
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
                <li>Code 1006 indicates network/server issue - usually backend is down</li>
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
