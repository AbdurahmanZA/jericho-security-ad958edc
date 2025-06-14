import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, TestTube, Wifi, WifiOff, Save, Camera } from 'lucide-react';
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
}

export const HikvisionSettings: React.FC = () => {
  const [cameras, setCameras] = useState<HikvisionCamera[]>([]);
  const [editingCamera, setEditingCamera] = useState<HikvisionCamera | null>(null);
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
  }, []);

  const loadCameras = () => {
    const savedCameras = localStorage.getItem('jericho-hikvision-cameras');
    if (savedCameras) {
      setCameras(JSON.parse(savedCameras));
    }
  };

  const saveCameras = (updatedCameras: HikvisionCamera[]) => {
    setCameras(updatedCameras);
    localStorage.setItem('jericho-hikvision-cameras', JSON.stringify(updatedCameras));
  };

  const createNewCamera = () => {
    const newCamera: HikvisionCamera = {
      id: `cam_${Date.now()}`,
      name: `Camera ${cameras.length + 1}`,
      ip: '',
      port: 80,
      username: 'admin',
      password: '',
      enabled: true,
      connected: false,
      events: ['VMD']
    };
    setEditingCamera(newCamera);
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

  const deleteCamera = (cameraId: string) => {
    const updatedCameras = cameras.filter(c => c.id !== cameraId);
    saveCameras(updatedCameras);
    
    toast({
      title: "Camera Deleted",
      description: "Camera removed successfully",
    });
  };

  const toggleCameraEnabled = (cameraId: string, enabled: boolean) => {
    const updatedCameras = cameras.map(c => 
      c.id === cameraId ? { ...c, enabled } : c
    );
    saveCameras(updatedCameras);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Hikvision Camera Setup</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Hikvision cameras for motion detection and alerts
          </p>
        </div>
        <Button onClick={createNewCamera} className="jericho-btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Camera
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera List */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">Connected Cameras</h4>
          
          {cameras.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No Cameras Configured</p>
              <p className="text-sm mt-1">Add a Hikvision camera to get started</p>
            </div>
          ) : (
            cameras.map((camera) => (
              <div key={camera.id} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{camera.name}</span>
                    {camera.connected ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCamera(camera)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCamera(camera.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-3">
                  <div>{camera.ip}:{camera.port}</div>
                  <div>User: {camera.username}</div>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={camera.enabled}
                      onCheckedChange={(checked) => 
                        toggleCameraEnabled(camera.id, checked as boolean)
                      }
                    />
                    <span className="text-sm font-medium">Monitor Events</span>
                  </div>
                  
                  <Badge variant={camera.connected ? "default" : "secondary"}>
                    {camera.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Active Events:</div>
                  <div className="flex flex-wrap gap-1">
                    {camera.events.map(event => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {eventTypes.find(e => e.id === event)?.label || event}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Panel */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">
            {editingCamera ? 'Camera Configuration' : 'Select Camera to Edit'}
          </h4>
          
          {editingCamera ? (
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
                <p className="font-semibold">No Camera Selected</p>
                <p className="text-sm mt-1">Select a camera to edit or add a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
