
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
import { Plus, Trash2, TestTube, Wifi, WifiOff } from 'lucide-react';
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

interface HikvisionSetupProps {
  open: boolean;
  onClose: () => void;
}

export const HikvisionSetup: React.FC<HikvisionSetupProps> = ({ open, onClose }) => {
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

  const loadCameras = async () => {
    try {
      const response = await fetch('/api/hikvision/cameras');
      if (response.ok) {
        const data = await response.json();
        setCameras(data.cameras || []);
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadCameras();
    }
  }, [open]);

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

  const saveCamera = async () => {
    if (!editingCamera) return;

    setLoading(true);
    try {
      const response = await fetch('/api/hikvision/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCamera)
      });

      if (response.ok) {
        await loadCameras();
        setEditingCamera(null);
        toast({
          title: "Camera Saved",
          description: `${editingCamera.name} configuration saved`,
        });
      } else {
        throw new Error('Failed to save camera');
      }
    } catch (error) {
      toast({
        title: "Save Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (camera: HikvisionCamera) => {
    setLoading(true);
    try {
      const response = await fetch('/api/hikvision/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: camera.ip,
          port: camera.port,
          username: camera.username,
          password: camera.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Connection Success",
          description: `Connected to ${camera.name}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Unable to connect to camera",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCamera = async (cameraId: string) => {
    try {
      const response = await fetch(`/api/hikvision/cameras/${cameraId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCameras(prev => prev.filter(c => c.id !== cameraId));
        toast({
          title: "Camera Deleted",
          description: "Camera removed successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleCameraEnabled = async (cameraId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/hikvision/cameras/${cameraId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        setCameras(prev => prev.map(c => 
          c.id === cameraId ? { ...c, enabled } : c
        ));
      }
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Hikvision Camera Setup</span>
            <Button
              variant="outline"
              size="sm"
              onClick={createNewCamera}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Camera
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-full">
          {/* Camera List */}
          <div className="w-1/2 overflow-y-auto">
            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{camera.name}</span>
                      {camera.connected ? (
                        <Wifi className="w-4 h-4 text-green-400" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCamera(camera)}
                        className="h-6 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCamera(camera.id)}
                        className="h-6 px-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-2">
                    <div>{camera.ip}:{camera.port}</div>
                    <div>User: {camera.username}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={camera.enabled}
                        onCheckedChange={(checked) => 
                          toggleCameraEnabled(camera.id, checked as boolean)
                        }
                      />
                      <span className="text-sm">Monitor Events</span>
                    </div>
                    
                    <Badge variant={camera.connected ? "default" : "secondary"}>
                      {camera.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">Active Events:</div>
                    <div className="flex flex-wrap gap-1">
                      {camera.events.map(event => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {eventTypes.find(e => e.id === event)?.label || event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {cameras.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p className="mb-2">No Hikvision cameras configured</p>
                  <p className="text-sm">Add a camera to enable motion detection</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Panel */}
          <div className="w-1/2 border-l border-gray-700 pl-4">
            {editingCamera ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {cameras.find(c => c.id === editingCamera.id) ? 'Edit Camera' : 'Add New Camera'}
                </h3>
                
                <div className="space-y-3">
                  <div>
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
                  
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
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
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => testConnection(editingCamera)}
                    disabled={loading || !editingCamera.ip || !editingCamera.password}
                    className="flex-1"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Connection
                  </Button>
                  <Button
                    onClick={saveCamera}
                    disabled={loading || !editingCamera.ip || !editingCamera.password}
                    className="flex-1"
                  >
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
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p className="mb-2">Select a camera to edit</p>
                  <p className="text-sm">or add a new one to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
