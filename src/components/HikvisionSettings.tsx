import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, TestTube, Wifi, WifiOff, Save, Camera, Cloud, Eye, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HikvisionCamera {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  enabled: boolean;
  connected: boolean;
  events: string[];
  type: 'rtsp' | 'ezviz' | 'hikconnect';
  cloudDeviceId?: string;
}

interface CloudAccount {
  id: string;
  type: 'ezviz' | 'hikconnect';
  username: string;
  password: string;
  connected: boolean;
  devices: CloudDevice[];
}

interface CloudDevice {
  deviceId: string;
  deviceName: string;
  deviceModel: string;
  status: 'online' | 'offline';
  channels: number;
}

export const HikvisionSettings: React.FC = () => {
  const [cameras, setCameras] = useState<HikvisionCamera[]>([]);
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccount[]>([]);
  const [editingCamera, setEditingCamera] = useState<HikvisionCamera | null>(null);
  const [editingAccount, setEditingAccount] = useState<CloudAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const eventTypes = [
    { id: 'VMD', label: 'Video Motion Detection' },
    { id: 'linedetection', label: 'Line Crossing Detection' },
    { id: 'regionEntrance', label: 'Region Entrance' },
    { id: 'regionExiting', label: 'Region Exiting' },
    { id: 'PIR', label: 'PIR Motion' },
    { id: 'tamperdetection', label: 'Tamper Detection' }
  ];

  useEffect(() => {
    loadCameras();
    loadCloudAccounts();
  }, []);

  const loadCameras = () => {
    const savedCameras = localStorage.getItem('jericho-hikvision-cameras');
    if (savedCameras) {
      setCameras(JSON.parse(savedCameras));
    }
  };

  const loadCloudAccounts = () => {
    const savedAccounts = localStorage.getItem('jericho-cloud-accounts');
    if (savedAccounts) {
      setCloudAccounts(JSON.parse(savedAccounts));
    }
  };

  const saveCameras = (updatedCameras: HikvisionCamera[]) => {
    setCameras(updatedCameras);
    localStorage.setItem('jericho-hikvision-cameras', JSON.stringify(updatedCameras));
  };

  const saveCloudAccounts = (updatedAccounts: CloudAccount[]) => {
    setCloudAccounts(updatedAccounts);
    localStorage.setItem('jericho-cloud-accounts', JSON.stringify(updatedAccounts));
  };

  const createNewCamera = (type: 'rtsp' | 'ezviz' | 'hikconnect' = 'rtsp') => {
    const newCamera: HikvisionCamera = {
      id: `cam_${Date.now()}`,
      name: `Camera ${cameras.length + 1}`,
      ip: '',
      port: 80,
      username: 'admin',
      password: '',
      enabled: true,
      connected: false,
      events: ['VMD'],
      type
    };
    setEditingCamera(newCamera);
  };

  const createCloudAccount = (type: 'ezviz' | 'hikconnect') => {
    const newAccount: CloudAccount = {
      id: `account_${Date.now()}`,
      type,
      username: '',
      password: '',
      connected: false,
      devices: []
    };
    setEditingAccount(newAccount);
  };

  const saveCamera = () => {
    if (!editingCamera) return;

    const existingIndex = cameras.findIndex(c => c.id === editingCamera.id);
    let updatedCameras;
    
    if (existingIndex >= 0) {
      updatedCameras = cameras.map(c => c.id === editingCamera.id ? editingCamera : c);
    } else {
      updatedCameras = [...cameras, editingCamera];
    }
    
    saveCameras(updatedCameras);
    setEditingCamera(null);
    
    toast({
      title: "Camera Saved",
      description: `${editingCamera.name} configuration saved`,
    });
  };

  const saveCloudAccount = async () => {
    if (!editingAccount) return;

    setLoading(true);
    try {
      // Simulate API call to connect to cloud service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock devices for demonstration
      const mockDevices: CloudDevice[] = [
        {
          deviceId: `${editingAccount.type}_device_1`,
          deviceName: `${editingAccount.type.toUpperCase()} Camera 1`,
          deviceModel: editingAccount.type === 'ezviz' ? 'CS-C6N' : 'DS-2CD2386G2-IU',
          status: 'online',
          channels: 1
        },
        {
          deviceId: `${editingAccount.type}_device_2`,
          deviceName: `${editingAccount.type.toUpperCase()} Camera 2`,
          deviceModel: editingAccount.type === 'ezviz' ? 'CS-C8C' : 'DS-2CD2147G2-L',
          status: 'online',
          channels: 1
        }
      ];

      const updatedAccount = {
        ...editingAccount,
        connected: true,
        devices: mockDevices
      };

      const existingIndex = cloudAccounts.findIndex(a => a.id === editingAccount.id);
      let updatedAccounts;
      
      if (existingIndex >= 0) {
        updatedAccounts = cloudAccounts.map(a => a.id === editingAccount.id ? updatedAccount : a);
      } else {
        updatedAccounts = [...cloudAccounts, updatedAccount];
      }
      
      saveCloudAccounts(updatedAccounts);
      setEditingAccount(null);
      
      toast({
        title: "Account Connected",
        description: `${editingAccount.type.toUpperCase()} account connected successfully`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to cloud service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCloudCamera = (account: CloudAccount, device: CloudDevice) => {
    const newCamera: HikvisionCamera = {
      id: `cloud_${device.deviceId}_${Date.now()}`,
      name: device.deviceName,
      ip: '', // Cloud cameras don't need IP
      port: 0,
      username: account.username,
      password: '', // Will use account credentials
      enabled: true,
      connected: device.status === 'online',
      events: ['VMD'],
      type: account.type,
      cloudDeviceId: device.deviceId
    };

    const updatedCameras = [...cameras, newCamera];
    saveCameras(updatedCameras);
    
    toast({
      title: "Cloud Camera Added",
      description: `${device.deviceName} added to monitoring`,
    });
  };

  const deleteCamera = (cameraId: string) => {
    const updatedCameras = cameras.filter(c => c.id !== cameraId);
    saveCameras(updatedCameras);
    
    toast({
      title: "Camera Deleted",
      description: "Camera removed successfully",
    });
  };

  const deleteCloudAccount = (accountId: string) => {
    // Remove associated cameras first
    const associatedCameras = cameras.filter(c => 
      cloudAccounts.find(a => a.id === accountId)?.devices.some(d => d.deviceId === c.cloudDeviceId)
    );
    
    const updatedCameras = cameras.filter(c => 
      !associatedCameras.some(ac => ac.id === c.id)
    );
    saveCameras(updatedCameras);
    
    // Remove account
    const updatedAccounts = cloudAccounts.filter(a => a.id !== accountId);
    saveCloudAccounts(updatedAccounts);
    
    toast({
      title: "Account Removed",
      description: "Cloud account and associated cameras removed",
    });
  };

  const toggleCameraEnabled = (cameraId: string, enabled: boolean) => {
    const updatedCameras = cameras.map(c => 
      c.id === cameraId ? { ...c, enabled } : c
    );
    saveCameras(updatedCameras);
  };

  const getCameraTypeIcon = (type: string) => {
    switch (type) {
      case 'ezviz': return <Eye className="w-4 h-4" />;
      case 'hikconnect': return <Link className="w-4 h-4" />;
      default: return <Camera className="w-4 h-4" />;
    }
  };

  const getCameraTypeBadge = (type: string) => {
    switch (type) {
      case 'ezviz': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">EZVIZ</Badge>;
      case 'hikconnect': return <Badge variant="secondary" className="bg-green-100 text-green-800">HikConnect</Badge>;
      default: return <Badge variant="outline">RTSP</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Hikvision Camera Setup</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Hikvision cameras, EZVIZ and HikConnect cloud accounts
          </p>
        </div>
      </div>

      <Tabs defaultValue="cameras" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cameras" className="flex items-center space-x-2">
            <Camera className="w-4 h-4" />
            <span>All Cameras</span>
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center space-x-2">
            <Cloud className="w-4 h-4" />
            <span>Cloud Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="rtsp" className="flex items-center space-x-2">
            <Wifi className="w-4 h-4" />
            <span>RTSP Setup</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cameras" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold uppercase tracking-wide">All Connected Cameras</h4>
            <div className="text-sm text-muted-foreground">
              {cameras.length} cameras configured
            </div>
          </div>
          
          {cameras.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No Cameras Configured</p>
              <p className="text-sm mt-1">Add cameras from RTSP or cloud accounts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map((camera) => (
                <div key={camera.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getCameraTypeIcon(camera.type)}
                      <span className="font-semibold text-sm">{camera.name}</span>
                      {camera.connected ? (
                        <Wifi className="w-3 h-3 text-green-500" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCamera(camera.id)}
                      className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {getCameraTypeBadge(camera.type)}
                    {camera.type === 'rtsp' && (
                      <div className="text-xs text-muted-foreground">
                        {camera.ip}:{camera.port}
                      </div>
                    )}
                    {camera.cloudDeviceId && (
                      <div className="text-xs text-muted-foreground">
                        Device: {camera.cloudDeviceId}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={camera.enabled}
                        onCheckedChange={(checked) => 
                          toggleCameraEnabled(camera.id, checked as boolean)
                        }
                      />
                      <span className="text-xs font-medium">Monitor</span>
                    </div>
                    
                    <Badge variant={camera.connected ? "default" : "secondary"} className="text-xs">
                      {camera.connected ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Events:</div>
                    <div className="flex flex-wrap gap-1">
                      {camera.events.slice(0, 2).map(event => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {eventTypes.find(e => e.id === event)?.label.split(' ')[0] || event}
                        </Badge>
                      ))}
                      {camera.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{camera.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cloud" className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold uppercase tracking-wide">Cloud Account Integration</h4>
            <div className="flex space-x-2">
              <Button onClick={() => createCloudAccount('ezviz')} variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Add EZVIZ
              </Button>
              <Button onClick={() => createCloudAccount('hikconnect')} variant="outline" size="sm">
                <Link className="w-4 h-4 mr-2" />
                Add HikConnect
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cloud Accounts List */}
            <div className="space-y-4">
              <h5 className="font-medium">Connected Accounts</h5>
              
              {cloudAccounts.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 border-2 border-dashed border-border rounded-lg">
                  <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cloud accounts connected</p>
                </div>
              ) : (
                cloudAccounts.map((account) => (
                  <div key={account.id} className="p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {account.type === 'ezviz' ? <Eye className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                        <span className="font-medium">{account.type.toUpperCase()}</span>
                        <Badge variant={account.connected ? "default" : "secondary"}>
                          {account.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAccount(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCloudAccount(account.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      Username: {account.username}
                    </div>
                    
                    {account.connected && account.devices.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Available Devices:</div>
                        {account.devices.map((device) => (
                          <div key={device.deviceId} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div>
                              <div className="text-sm font-medium">{device.deviceName}</div>
                              <div className="text-xs text-muted-foreground">{device.deviceModel}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                                {device.status}
                              </Badge>
                              {!cameras.some(c => c.cloudDeviceId === device.deviceId) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addCloudCamera(account, device)}
                                  className="h-6 text-xs"
                                >
                                  Add
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs">Added</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Account Setup Panel */}
            <div className="space-y-4">
              <h5 className="font-medium">
                {editingAccount ? `${editingAccount.type.toUpperCase()} Account Setup` : 'Select Account to Edit'}
              </h5>
              
              {editingAccount ? (
                <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center space-x-2 mb-4">
                    {editingAccount.type === 'ezviz' ? <Eye className="w-5 h-5" /> : <Link className="w-5 h-5" />}
                    <span className="font-medium">{editingAccount.type.toUpperCase()} Account</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cloud-username">Username/Email</Label>
                      <Input
                        id="cloud-username"
                        value={editingAccount.username}
                        onChange={(e) => setEditingAccount({
                          ...editingAccount,
                          username: e.target.value
                        })}
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cloud-password">Password</Label>
                      <Input
                        id="cloud-password"
                        type="password"
                        value={editingAccount.password}
                        onChange={(e) => setEditingAccount({
                          ...editingAccount,
                          password: e.target.value
                        })}
                        placeholder="password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={saveCloudAccount}
                      disabled={loading || !editingAccount.username || !editingAccount.password}
                      className="flex-1"
                    >
                      {loading ? 'Connecting...' : 'Connect Account'}
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setEditingAccount(null)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <div className="text-center">
                    <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select an account to edit or add a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rtsp" className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold uppercase tracking-wide">RTSP Camera Setup</h4>
            <Button onClick={() => createNewCamera('rtsp')} className="jericho-btn-accent">
              <Plus className="w-4 h-4 mr-2" />
              Add RTSP Camera
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RTSP Camera List */}
            <div className="space-y-4">
              <h5 className="font-medium">RTSP Cameras</h5>
              
              {cameras.filter(c => c.type === 'rtsp').length === 0 ? (
                <div className="text-center text-muted-foreground py-6 border-2 border-dashed border-border rounded-lg">
                  <Wifi className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No RTSP cameras configured</p>
                </div>
              ) : (
                cameras.filter(c => c.type === 'rtsp').map((camera) => (
                  <div key={camera.id} className="p-4 border border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4" />
                        <span className="font-semibold">{camera.name}</span>
                        {camera.connected ? (
                          <Wifi className="w-3 h-3 text-green-500" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCamera(camera.id)}
                        className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {getCameraTypeBadge(camera.type)}
                      {camera.type === 'rtsp' && (
                        <div className="text-xs text-muted-foreground">
                          {camera.ip}:{camera.port}
                        </div>
                      )}
                      {camera.cloudDeviceId && (
                        <div className="text-xs text-muted-foreground">
                          Device: {camera.cloudDeviceId}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={camera.enabled}
                          onCheckedChange={(checked) => 
                            toggleCameraEnabled(camera.id, checked as boolean)
                          }
                        />
                        <span className="text-xs font-medium">Monitor</span>
                      </div>
                      
                      <Badge variant={camera.connected ? "default" : "secondary"} className="text-xs">
                        {camera.connected ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Events:</div>
                      <div className="flex flex-wrap gap-1">
                        {camera.events.slice(0, 2).map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {eventTypes.find(e => e.id === event)?.label.split(' ')[0] || event}
                          </Badge>
                        ))}
                        {camera.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{camera.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* RTSP Edit Panel */}
            <div className="space-y-4">
              <h5 className="font-medium">
                {editingCamera && editingCamera.type === 'rtsp' ? 'RTSP Camera Configuration' : 'Select RTSP Camera to Edit'}
              </h5>
              
              {editingCamera && editingCamera.type === 'rtsp' ? (
                <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Camera Name</Label>
                      <Input
                        id="name"
                        value={editingCamera.name}
                        onChange={(e) => setEditingCamera({
                          ...editingCamera,
                          name: e.target.value
                        })}
                        placeholder="Living Room Camera"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ip">IP Address</Label>
                      <Input
                        id="ip"
                        value={editingCamera.ip}
                        onChange={(e) => setEditingCamera({
                          ...editingCamera,
                          ip: e.target.value
                        })}
                        placeholder="192.168.1.100"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={editingCamera.port}
                        onChange={(e) => setEditingCamera({
                          ...editingCamera,
                          port: parseInt(e.target.value) || 80
                        })}
                        placeholder="80"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={editingCamera.username}
                        onChange={(e) => setEditingCamera({
                          ...editingCamera,
                          username: e.target.value
                        })}
                        placeholder="admin"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={editingCamera.password}
                        onChange={(e) => setEditingCamera({
                          ...editingCamera,
                          password: e.target.value
                        })}
                        placeholder="password"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Event Types to Monitor</Label>
                    <div className="mt-2 space-y-2">
                      {eventTypes.map(event => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={editingCamera.events.includes(event.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingCamera({
                                  ...editingCamera,
                                  events: [...editingCamera.events, event.id]
                                });
                              } else {
                                setEditingCamera({
                                  ...editingCamera,
                                  events: editingCamera.events.filter(e => e !== event.id)
                                });
                              }
                            }}
                          />
                          <span className="text-sm">{event.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => toast({ title: "Test Connection", description: "Feature coming soon" })}
                      disabled={!editingCamera.ip || !editingCamera.password}
                      className="flex-1"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                    <Button
                      onClick={saveCamera}
                      disabled={!editingCamera.ip || !editingCamera.password}
                      className="flex-1 jericho-btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Camera
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setEditingCamera(null)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">No RTSP Camera Selected</p>
                    <p className="text-sm mt-1">Select a camera to edit or add a new one</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
