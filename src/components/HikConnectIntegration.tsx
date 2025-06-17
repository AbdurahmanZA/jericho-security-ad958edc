
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Link, 
  Key, 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Camera,
  Play,
  Square,
  RotateCcw,
  Download,
  Calendar,
  Zap,
  AlertTriangle,
  Clock,
  Wifi
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HikvisionApiService, HikvisionDevice, HikvisionCredentials, HikvisionEvent, HikvisionStream } from '@/services/hikvisionApi';

interface HikConnectIntegrationProps {
  onDevicesUpdate?: (devices: HikvisionDevice[]) => void;
}

export const HikConnectIntegration: React.FC<HikConnectIntegrationProps> = ({ onDevicesUpdate }) => {
  const [credentials, setCredentials] = useState<HikvisionCredentials>({
    appKey: '',
    appSecret: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState<HikvisionDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HikvisionDevice | null>(null);
  const [activeStreams, setActiveStreams] = useState<Map<string, HikvisionStream>>(new Map());
  const [recentEvents, setRecentEvents] = useState<HikvisionEvent[]>([]);
  const [apiService, setApiService] = useState<HikvisionApiService | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = () => {
    const saved = localStorage.getItem('jericho-hikconnect-credentials');
    if (saved) {
      try {
        const parsedCredentials = JSON.parse(saved);
        setCredentials(parsedCredentials);
        if (parsedCredentials.accessToken) {
          const service = new HikvisionApiService(parsedCredentials);
          setApiService(service);
          setIsConnected(true);
          loadDevices(service);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    }
  };

  const saveCredentials = (creds: HikvisionCredentials) => {
    localStorage.setItem('jericho-hikconnect-credentials', JSON.stringify(creds));
  };

  const handleConnect = async () => {
    if (!credentials.appKey || !credentials.appSecret) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both AppKey and AppSecret",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const service = new HikvisionApiService(credentials);
      await service.getAccessToken();
      
      setApiService(service);
      setIsConnected(true);
      saveCredentials(service.credentials || credentials);
      
      toast({
        title: "Connected Successfully",
        description: "Hik-Connect integration is now active",
      });

      await loadDevices(service);
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Hik-Connect",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setApiService(null);
    setDevices([]);
    setSelectedDevice(null);
    setActiveStreams(new Map());
    setRecentEvents([]);
    localStorage.removeItem('jericho-hikconnect-credentials');
    
    toast({
      title: "Disconnected",
      description: "Hik-Connect integration has been disabled",
    });
  };

  const loadDevices = async (service: HikvisionApiService) => {
    setLoading(true);
    try {
      await service.ensureValidToken();
      const deviceList = await service.getDeviceList();
      setDevices(deviceList);
      onDevicesUpdate?.(deviceList);
      
      toast({
        title: "Devices Loaded",
        description: `Found ${deviceList.length} devices`,
      });
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast({
        title: "Failed to Load Devices",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startLiveStream = async (device: HikvisionDevice, protocol: 'hls' | 'rtmp' | 'rtsp' = 'hls') => {
    if (!apiService) return;

    try {
      await apiService.ensureValidToken();
      const stream = await apiService.startLive(device.deviceSerial, device.channelNo, protocol);
      
      setActiveStreams(prev => new Map(prev).set(`${device.deviceSerial}_${device.channelNo}`, stream));
      
      toast({
        title: "Stream Started",
        description: `Live stream for ${device.deviceName} is now active`,
      });
    } catch (error) {
      console.error('Failed to start stream:', error);
      toast({
        title: "Stream Failed",
        description: error instanceof Error ? error.message : "Failed to start live stream",
        variant: "destructive",
      });
    }
  };

  const stopLiveStream = async (device: HikvisionDevice) => {
    if (!apiService) return;

    try {
      await apiService.ensureValidToken();
      await apiService.stopLive(device.deviceSerial, device.channelNo);
      
      setActiveStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(`${device.deviceSerial}_${device.channelNo}`);
        return newMap;
      });
      
      toast({
        title: "Stream Stopped",
        description: `Live stream for ${device.deviceName} has been stopped`,
      });
    } catch (error) {
      console.error('Failed to stop stream:', error);
      toast({
        title: "Stop Failed",
        description: error instanceof Error ? error.message : "Failed to stop live stream",
        variant: "destructive",
      });
    }
  };

  const loadRecentEvents = async (device: HikvisionDevice) => {
    if (!apiService) return;

    try {
      await apiService.ensureValidToken();
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
      
      const events = await apiService.getAlarmList(device.deviceSerial, startTime, endTime);
      setRecentEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast({
        title: "Events Failed",
        description: "Failed to load recent events",
        variant: "destructive",
      });
    }
  };

  const captureSnapshot = async (device: HikvisionDevice) => {
    if (!apiService) return;

    try {
      await apiService.ensureValidToken();
      const picUrl = await apiService.captureImage(device.deviceSerial, device.channelNo);
      
      // Open image in new tab
      window.open(picUrl, '_blank');
      
      toast({
        title: "Snapshot Captured",
        description: `Snapshot from ${device.deviceName} captured successfully`,
      });
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
      toast({
        title: "Capture Failed",
        description: error instanceof Error ? error.message : "Failed to capture snapshot",
        variant: "destructive",
      });
    }
  };

  const isStreamActive = (device: HikvisionDevice) => {
    return activeStreams.has(`${device.deviceSerial}_${device.channelNo}`);
  };

  const getStreamUrl = (device: HikvisionDevice) => {
    return activeStreams.get(`${device.deviceSerial}_${device.channelNo}`)?.url;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Link className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Hik-Connect Integration</h3>
            <p className="text-sm text-muted-foreground">
              Production-ready Hikvision cloud service integration
            </p>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
          {isConnected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </Badge>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Production Integration</AlertTitle>
        <AlertDescription>
          This is a full production-ready Hik-Connect integration supporting live streaming, 
          device management, event monitoring, and PTZ control.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="credentials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="streams">Live Streams</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>API Credentials</span>
              </CardTitle>
              <CardDescription>
                Enter your Hikvision AppKey (AK) and AppSecret (SK) from the developer portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appKey">AppKey (AK)</Label>
                  <Input
                    id="appKey"
                    type="text"
                    value={credentials.appKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, appKey: e.target.value }))}
                    placeholder="Enter your AppKey"
                    disabled={isConnected}
                  />
                </div>
                <div>
                  <Label htmlFor="appSecret">AppSecret (SK)</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    value={credentials.appSecret}
                    onChange={(e) => setCredentials(prev => ({ ...prev, appSecret: e.target.value }))}
                    placeholder="Enter your AppSecret"
                    disabled={isConnected}
                  />
                </div>
              </div>

              {isConnected && credentials.accessToken && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Status:</strong> Connected and authenticated</p>
                      <p><strong>Token expires:</strong> {credentials.tokenExpiry ? new Date(credentials.tokenExpiry).toLocaleString() : 'Unknown'}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect} 
                    disabled={isConnecting || !credentials.appKey || !credentials.appSecret}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Connect to Hik-Connect
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => apiService && loadDevices(apiService)} 
                      variant="outline"
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button 
                      onClick={handleDisconnect} 
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Connected Devices</span>
                </div>
                <Badge variant="outline">{devices.length} devices</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center text-muted-foreground py-8">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Connect to Hik-Connect to view devices</p>
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No devices found</p>
                  <Button 
                    onClick={() => apiService && loadDevices(apiService)} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Devices
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {devices.map((device) => (
                      <div key={device.deviceSerial} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{device.deviceName}</h4>
                              <p className="text-sm text-muted-foreground">{device.deviceModel}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                              <Wifi className="w-3 h-3 mr-1" />
                              {device.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => captureSnapshot(device)}
                            disabled={device.status === 'offline'}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Snapshot
                          </Button>
                          <Button 
                            size="sm" 
                            variant={isStreamActive(device) ? "destructive" : "default"}
                            onClick={() => isStreamActive(device) ? stopLiveStream(device) : startLiveStream(device)}
                            disabled={device.status === 'offline'}
                          >
                            {isStreamActive(device) ? (
                              <>
                                <Square className="w-3 h-3 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Live
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedDevice(device);
                              loadRecentEvents(device);
                            }}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Events
                          </Button>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Serial: {device.deviceSerial}</div>
                          <div>Channel: {device.channelNo}</div>
                          {isStreamActive(device) && (
                            <div className="text-green-600 font-medium">
                              🔴 Live stream active: {getStreamUrl(device)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Active Live Streams</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeStreams.size === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active streams</p>
                  <p className="text-sm">Start a live stream from the devices tab</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(activeStreams.entries()).map(([key, stream]) => {
                    const device = devices.find(d => d.deviceSerial === stream.deviceSerial);
                    return (
                      <div key={key} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{device?.deviceName || stream.deviceSerial}</h4>
                            <p className="text-sm text-muted-foreground">
                              {stream.streamType.toUpperCase()} - {stream.quality}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => device && stopLiveStream(device)}
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground break-all">
                          {stream.url}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Recent Events</span>
              </CardTitle>
              {selectedDevice && (
                <CardDescription>
                  Events for {selectedDevice.deviceName} (Last 24 hours)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!selectedDevice ? (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a device to view events</p>
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent events</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div key={event.eventId} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span className="font-medium">{event.eventType}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(event.eventTime).toLocaleString()}</span>
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Channel: {event.channelNo} | ID: {event.eventId}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
