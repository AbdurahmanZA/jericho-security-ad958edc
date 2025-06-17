
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Camera, 
  Wifi, 
  Server, 
  Cloud, 
  TestTube, 
  Eye,
  EyeOff,
  Settings,
  Monitor
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraSource {
  id: string;
  name: string;
  type: 'manual' | 'ip' | 'nvr' | 'hikconnect';
  url?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  status: 'idle' | 'connecting' | 'connected' | 'failed';
  cameras?: Array<{
    id: string;
    name: string;
    channel: number;
    rtspUrl: string;
    selected: boolean;
  }>;
}

interface ComprehensiveCameraSetupProps {
  open: boolean;
  onClose: () => void;
  onAddCameras: (cameras: Array<{ id: number; name: string; url: string; }>) => void;
  existingCameras: Record<number, string>;
}

export const ComprehensiveCameraSetup: React.FC<ComprehensiveCameraSetupProps> = ({
  open,
  onClose,
  onAddCameras,
  existingCameras
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [cameraSources, setCameraSources] = useState<CameraSource[]>([]);
  const [manualUrl, setManualUrl] = useState('');
  const [manualName, setManualName] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // IP Camera Discovery
  const [ipRange, setIpRange] = useState('192.168.1.');
  const [startRange, setStartRange] = useState(100);
  const [endRange, setEndRange] = useState(200);
  const [discoveredCameras, setDiscoveredCameras] = useState<Array<{
    ip: string;
    name: string;
    model: string;
    status: 'online' | 'offline';
    selected: boolean;
  }>>([]);

  // NVR/DVR Connection
  const [nvrConfig, setNvrConfig] = useState({
    ip: '',
    port: 80,
    username: 'admin',
    password: '',
    type: 'hikvision' as 'hikvision' | 'dahua' | 'generic'
  });

  // HikConnect Integration
  const [hikConnectConfig, setHikConnectConfig] = useState({
    email: '',
    password: '',
    region: 'global' as 'global' | 'eu' | 'russia' | 'asiaeast'
  });

  const addManualCamera = () => {
    if (!manualUrl.trim() || !manualName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both camera name and RTSP URL",
        variant: "destructive",
      });
      return;
    }

    const newSource: CameraSource = {
      id: `manual_${Date.now()}`,
      name: manualName,
      type: 'manual',
      url: manualUrl,
      status: 'idle',
      cameras: [{
        id: '1',
        name: manualName,
        channel: 1,
        rtspUrl: manualUrl,
        selected: true
      }]
    };

    setCameraSources(prev => [...prev, newSource]);
    setManualUrl('');
    setManualName('');
    
    toast({
      title: "Camera Added",
      description: `${manualName} added to setup`,
    });
  };

  const discoverIPCameras = async () => {
    setLoading(true);
    try {
      // Simulate IP camera discovery
      const discovered = [];
      for (let i = startRange; i <= Math.min(endRange, startRange + 10); i++) {
        const ip = `${ipRange}${i}`;
        discovered.push({
          ip,
          name: `Camera ${ip}`,
          model: 'Generic IP Camera',
          status: Math.random() > 0.7 ? 'online' : 'offline' as 'online' | 'offline',
          selected: false
        });
      }
      setDiscoveredCameras(discovered);
      
      toast({
        title: "Discovery Complete",
        description: `Found ${discovered.filter(c => c.status === 'online').length} online cameras`,
      });
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Unable to discover IP cameras",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToNVR = async () => {
    if (!nvrConfig.ip || !nvrConfig.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter NVR IP and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate NVR connection and camera discovery
      const cameras = Array.from({ length: 8 }, (_, i) => ({
        id: `ch${i + 1}`,
        name: `Camera Channel ${i + 1}`,
        channel: i + 1,
        rtspUrl: `rtsp://${nvrConfig.username}:${nvrConfig.password}@${nvrConfig.ip}:554/Streaming/Channels/${(i + 1) * 100 + 1}`,
        selected: false
      }));

      const nvrSource: CameraSource = {
        id: `nvr_${Date.now()}`,
        name: `${nvrConfig.type.toUpperCase()} NVR (${nvrConfig.ip})`,
        type: 'nvr',
        ip: nvrConfig.ip,
        port: nvrConfig.port,
        username: nvrConfig.username,
        password: nvrConfig.password,
        status: 'connected',
        cameras
      };

      setCameraSources(prev => [...prev, nvrSource]);
      
      toast({
        title: "NVR Connected",
        description: `Connected to ${nvrConfig.type.toUpperCase()} NVR - ${cameras.length} channels found`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to NVR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectToHikConnect = async () => {
    if (!hikConnectConfig.email || !hikConnectConfig.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter HikConnect email and password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate HikConnect connection
      const cameras = [
        {
          id: 'hik_001',
          name: 'Front Door Camera',
          channel: 1,
          rtspUrl: 'rtsp://stream.hikconnect.com/path1',
          selected: false
        },
        {
          id: 'hik_002',
          name: 'Backyard Camera',
          channel: 1,
          rtspUrl: 'rtsp://stream.hikconnect.com/path2',
          selected: false
        }
      ];

      const hikSource: CameraSource = {
        id: `hik_${Date.now()}`,
        name: `HikConnect Account (${hikConnectConfig.email})`,
        type: 'hikconnect',
        status: 'connected',
        cameras
      };

      setCameraSources(prev => [...prev, hikSource]);
      
      toast({
        title: "HikConnect Connected",
        description: `Connected to account - ${cameras.length} cameras found`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to HikConnect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraSelection = (sourceId: string, cameraId: string) => {
    setCameraSources(prev => prev.map(source => 
      source.id === sourceId 
        ? {
            ...source,
            cameras: source.cameras?.map(cam => 
              cam.id === cameraId 
                ? { ...cam, selected: !cam.selected }
                : cam
            )
          }
        : source
    ));
  };

  const handleAddSelectedCameras = () => {
    const selectedCameras: Array<{ id: number; name: string; url: string; }> = [];
    let cameraIndex = 1;

    cameraSources.forEach(source => {
      source.cameras?.forEach(camera => {
        if (camera.selected && cameraIndex <= 12) {
          selectedCameras.push({
            id: cameraIndex,
            name: camera.name,
            url: camera.rtspUrl
          });
          cameraIndex++;
        }
      });
    });

    if (selectedCameras.length === 0) {
      toast({
        title: "No Cameras Selected",
        description: "Please select at least one camera to add",
        variant: "destructive",
      });
      return;
    }

    onAddCameras(selectedCameras);
    onClose();
    
    toast({
      title: "Cameras Added",
      description: `${selectedCameras.length} cameras added to display`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Add Cameras - Comprehensive Setup</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual">Manual RTSP</TabsTrigger>
            <TabsTrigger value="discovery">IP Discovery</TabsTrigger>
            <TabsTrigger value="nvr">NVR/DVR</TabsTrigger>
            <TabsTrigger value="hikconnect">HikConnect</TabsTrigger>
          </TabsList>

          <div className="flex gap-4 h-full mt-4">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="manual" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Manual RTSP Camera Setup</CardTitle>
                    <CardDescription>Add cameras by entering RTSP URL directly</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Camera Name</Label>
                      <Input
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Living Room Camera"
                      />
                    </div>
                    <div>
                      <Label>RTSP URL</Label>
                      <Input
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="rtsp://username:password@192.168.1.100:554/stream"
                      />
                    </div>
                    <Button onClick={addManualCamera} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Camera
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discovery" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>IP Camera Discovery</CardTitle>
                    <CardDescription>Discover cameras on your network</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>IP Range</Label>
                        <Input
                          value={ipRange}
                          onChange={(e) => setIpRange(e.target.value)}
                          placeholder="192.168.1."
                        />
                      </div>
                      <div>
                        <Label>Start</Label>
                        <Input
                          type="number"
                          value={startRange}
                          onChange={(e) => setStartRange(parseInt(e.target.value) || 100)}
                        />
                      </div>
                      <div>
                        <Label>End</Label>
                        <Input
                          type="number"
                          value={endRange}
                          onChange={(e) => setEndRange(parseInt(e.target.value) || 200)}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={discoverIPCameras} 
                      disabled={loading}
                      className="w-full"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {loading ? 'Scanning...' : 'Discover Cameras'}
                    </Button>
                    
                    {discoveredCameras.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Discovered Cameras:</h4>
                        {discoveredCameras.map((camera, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={camera.selected}
                                onCheckedChange={(checked) => {
                                  setDiscoveredCameras(prev => prev.map((c, i) => 
                                    i === index ? { ...c, selected: checked as boolean } : c
                                  ));
                                }}
                              />
                              <span>{camera.ip}</span>
                              <Badge variant={camera.status === 'online' ? 'default' : 'secondary'}>
                                {camera.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nvr" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>NVR/DVR Connection</CardTitle>
                    <CardDescription>Connect to Network Video Recorder or Digital Video Recorder</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>NVR IP Address</Label>
                        <Input
                          value={nvrConfig.ip}
                          onChange={(e) => setNvrConfig(prev => ({ ...prev, ip: e.target.value }))}
                          placeholder="192.168.1.100"
                        />
                      </div>
                      <div>
                        <Label>Port</Label>
                        <Input
                          type="number"
                          value={nvrConfig.port}
                          onChange={(e) => setNvrConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 80 }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Username</Label>
                        <Input
                          value={nvrConfig.username}
                          onChange={(e) => setNvrConfig(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.nvr ? 'text' : 'password'}
                            value={nvrConfig.password}
                            onChange={(e) => setNvrConfig(prev => ({ ...prev, password: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPasswords(prev => ({ ...prev, nvr: !prev.nvr }))}
                          >
                            {showPasswords.nvr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={connectToNVR} 
                      disabled={loading}
                      className="w-full"
                    >
                      <Server className="w-4 h-4 mr-2" />
                      {loading ? 'Connecting...' : 'Connect to NVR'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hikconnect" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>HikConnect Integration</CardTitle>
                    <CardDescription>Connect to your HikConnect cloud account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={hikConnectConfig.email}
                        onChange={(e) => setHikConnectConfig(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.hik ? 'text' : 'password'}
                          value={hikConnectConfig.password}
                          onChange={(e) => setHikConnectConfig(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(prev => ({ ...prev, hik: !prev.hik }))}
                        >
                          {showPasswords.hik ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={connectToHikConnect} 
                      disabled={loading}
                      className="w-full"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      {loading ? 'Connecting...' : 'Connect to HikConnect'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

            {/* Camera Sources Panel */}
            <div className="w-80 border-l border-gray-700 pl-4">
              <h3 className="text-lg font-medium mb-4">Camera Sources ({cameraSources.length})</h3>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {cameraSources.map((source) => (
                  <Card key={source.id} className="bg-gray-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{source.name}</CardTitle>
                        <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {source.cameras && (
                        <div className="space-y-1">
                          {source.cameras.map((camera) => (
                            <div key={camera.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={camera.selected}
                                onCheckedChange={() => toggleCameraSelection(source.id, camera.id)}
                              />
                              <span className="text-xs truncate">{camera.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {cameraSources.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No camera sources added yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Total Sources: {cameraSources.length}</span>
            <span>Selected Cameras: {cameraSources.reduce((acc, source) => acc + (source.cameras?.filter(c => c.selected).length || 0), 0)}</span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAddSelectedCameras}>
              Add Selected Cameras
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
