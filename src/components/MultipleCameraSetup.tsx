
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
import { Plus, Trash2, Camera, Wifi, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraConfig {
  id: number;
  name: string;
  url: string;
  selected: boolean;
}

interface HikvisionCamera {
  id: string;
  name: string;
  deviceSerial: string;
  channelNo: number;
  rtspUrl: string;
  status: 'online' | 'offline';
}

interface MultipleCameraSetupProps {
  open: boolean;
  onClose: () => void;
  onSave: (cameras: Array<{ id: number; name: string; url: string; }>) => void;
  existingCameras: Record<number, string>;
}

export const MultipleCameraSetup: React.FC<MultipleCameraSetupProps> = ({
  open,
  onClose,
  onSave,
  existingCameras
}) => {
  const [manualCameras, setManualCameras] = useState<CameraConfig[]>([]);
  const [hikvisionCameras, setHikvisionCameras] = useState<HikvisionCamera[]>([]);
  const [loadingHikvision, setLoadingHikvision] = useState(false);
  const [selectedTab, setSelectedTab] = useState('manual');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      initializeManualCameras();
      loadHikvisionCameras();
    }
  }, [open]);

  const initializeManualCameras = () => {
    const cameras: CameraConfig[] = [];
    for (let i = 1; i <= 12; i++) {
      cameras.push({
        id: i,
        name: `Camera ${i}`,
        url: existingCameras[i] || '',
        selected: false
      });
    }
    setManualCameras(cameras);
  };

  const loadHikvisionCameras = async () => {
    setLoadingHikvision(true);
    try {
      const response = await fetch('/api/hikvision/devices');
      if (response.ok) {
        const data = await response.json();
        setHikvisionCameras(data.devices || []);
      }
    } catch (error) {
      console.error('Error loading Hikvision cameras:', error);
      // Demo data for development
      setHikvisionCameras([
        {
          id: 'hik_001',
          name: 'Front Door Camera',
          deviceSerial: 'DS-2CD2143G0-I',
          channelNo: 1,
          rtspUrl: 'rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101',
          status: 'online'
        },
        {
          id: 'hik_002',
          name: 'Backyard Camera',
          deviceSerial: 'DS-2CD2143G0-I',
          channelNo: 1,
          rtspUrl: 'rtsp://admin:password@192.168.1.101:554/Streaming/Channels/101',
          status: 'online'
        },
        {
          id: 'hik_003',
          name: 'Garage Camera',
          deviceSerial: 'DS-2CD2043G0-I',
          channelNo: 1,
          rtspUrl: 'rtsp://admin:password@192.168.1.102:554/Streaming/Channels/101',
          status: 'offline'
        }
      ]);
    } finally {
      setLoadingHikvision(false);
    }
  };

  const updateManualCamera = (index: number, field: keyof CameraConfig, value: string | boolean) => {
    setManualCameras(prev => prev.map((cam, i) => 
      i === index ? { ...cam, [field]: value } : cam
    ));
  };

  const addBulkRTSPCameras = () => {
    const baseIP = '192.168.1.';
    const startIP = 100;
    const username = 'admin';
    const password = 'password';
    
    const newCameras = manualCameras.map((cam, index) => ({
      ...cam,
      url: cam.url || `rtsp://${username}:${password}@${baseIP}${startIP + index}:554/Streaming/Channels/101`,
      selected: !cam.url // Select cameras that don't have URLs yet
    }));
    
    setManualCameras(newCameras);
    
    toast({
      title: "Bulk URLs Generated",
      description: "RTSP URLs generated for empty cameras",
    });
  };

  const handleSave = () => {
    let camerasToSave: Array<{ id: number; name: string; url: string; }> = [];

    if (selectedTab === 'manual') {
      camerasToSave = manualCameras
        .filter(cam => cam.selected && cam.url.trim())
        .map(cam => ({ id: cam.id, name: cam.name, url: cam.url }));
    } else {
      // For Hikvision cameras, map to available slots
      const selectedHikvision = hikvisionCameras.filter(cam => cam.status === 'online');
      camerasToSave = selectedHikvision.slice(0, 12).map((cam, index) => ({
        id: index + 1,
        name: cam.name,
        url: cam.rtspUrl
      }));
    }

    if (camerasToSave.length === 0) {
      toast({
        title: "No Cameras Selected",
        description: "Please select at least one camera to add",
        variant: "destructive",
      });
      return;
    }

    onSave(camerasToSave);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Add Multiple Cameras</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            <TabsTrigger value="hikvision">Hikvision Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="h-full mt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Manual Camera Configuration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBulkRTSPCameras}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate Bulk RTSP URLs
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
                {manualCameras.map((camera, index) => (
                  <div
                    key={camera.id}
                    className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        checked={camera.selected}
                        onCheckedChange={(checked) => 
                          updateManualCamera(index, 'selected', checked as boolean)
                        }
                      />
                      <Label className="font-medium">Camera {camera.id}</Label>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`name-${camera.id}`} className="text-xs">Name</Label>
                        <Input
                          id={`name-${camera.id}`}
                          value={camera.name}
                          onChange={(e) => updateManualCamera(index, 'name', e.target.value)}
                          placeholder="Camera Name"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`url-${camera.id}`} className="text-xs">RTSP URL</Label>
                        <Input
                          id={`url-${camera.id}`}
                          value={camera.url}
                          onChange={(e) => updateManualCamera(index, 'url', e.target.value)}
                          placeholder="rtsp://user:pass@ip:port/path"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hikvision" className="h-full mt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Hikvision Integration</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHikvisionCameras}
                  disabled={loadingHikvision}
                >
                  {loadingHikvision ? 'Loading...' : 'Refresh Devices'}
                </Button>
              </div>

              {hikvisionCameras.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
                  {hikvisionCameras.map((camera) => (
                    <div
                      key={camera.id}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Camera className="w-4 h-4" />
                          <span className="font-medium">{camera.name}</span>
                        </div>
                        <Badge variant={camera.status === 'online' ? 'default' : 'secondary'}>
                          {camera.status === 'online' ? (
                            <Wifi className="w-3 h-3 mr-1" />
                          ) : null}
                          {camera.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>Serial: {camera.deviceSerial}</div>
                        <div>Channel: {camera.channelNo}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {camera.rtspUrl}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No Hikvision cameras found</p>
                  <p className="text-sm">Make sure your Hikvision account is connected</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Add Selected Cameras
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
