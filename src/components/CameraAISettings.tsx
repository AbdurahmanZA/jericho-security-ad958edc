
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Brain, Eye, AlertTriangle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraGroup {
  id: string;
  name: string;
  source: 'manual' | 'hikvision' | 'hikconnect';
  account?: string;
  cameras: CameraAIConfig[];
}

interface CameraAIConfig {
  id: string;
  name: string;
  url: string;
  aiEnabled: boolean;
  detectionTypes: string[];
  confidence: number;
  alertsEnabled: boolean;
  status: 'online' | 'offline';
}

export const CameraAISettings: React.FC = () => {
  const [cameraGroups, setCameraGroups] = useState<CameraGroup[]>([]);
  const [globalAI, setGlobalAI] = useState(false);
  const { toast } = useToast();

  const detectionOptions = [
    'person', 'vehicle', 'animal', 'package', 'face', 'motion'
  ];

  useEffect(() => {
    loadCameraGroups();
  }, []);

  const loadCameraGroups = () => {
    // Load from localStorage or API
    const savedCameras = localStorage.getItem('jericho-cameras') || '{}';
    const cameras = JSON.parse(savedCameras);
    
    // Mock data for demonstration
    const groups: CameraGroup[] = [
      {
        id: 'manual-group',
        name: 'Manual RTSP Cameras',
        source: 'manual',
        cameras: [
          {
            id: 'cam-1',
            name: 'Front Door',
            url: 'rtsp://admin:password@192.168.1.100:554/stream',
            aiEnabled: true,
            detectionTypes: ['person', 'vehicle'],
            confidence: 75,
            alertsEnabled: true,
            status: 'online'
          },
          {
            id: 'cam-2',
            name: 'Backyard',
            url: 'rtsp://admin:password@192.168.1.101:554/stream',
            aiEnabled: false,
            detectionTypes: ['motion'],
            confidence: 80,
            alertsEnabled: false,
            status: 'offline'
          }
        ]
      },
      {
        id: 'hikconnect-group',
        name: 'HikConnect Cameras',
        source: 'hikconnect',
        account: 'security@company.com',
        cameras: [
          {
            id: 'hik-1',
            name: 'Parking Lot',
            url: 'hikconnect://device123/channel1',
            aiEnabled: true,
            detectionTypes: ['person', 'vehicle', 'motion'],
            confidence: 85,
            alertsEnabled: true,
            status: 'online'
          }
        ]
      }
    ];

    setCameraGroups(groups);
  };

  const updateCameraAI = (groupId: string, cameraId: string, updates: Partial<CameraAIConfig>) => {
    setCameraGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            cameras: group.cameras.map(cam => 
              cam.id === cameraId ? { ...cam, ...updates } : cam
            )
          }
        : group
    ));

    toast({
      title: "Camera AI Updated",
      description: "AI settings have been saved",
    });
  };

  const toggleGlobalAI = (enabled: boolean) => {
    setGlobalAI(enabled);
    setCameraGroups(prev => prev.map(group => ({
      ...group,
      cameras: group.cameras.map(cam => ({ ...cam, aiEnabled: enabled }))
    })));

    toast({
      title: enabled ? "AI Enabled Globally" : "AI Disabled Globally",
      description: `AI assistance ${enabled ? 'activated' : 'deactivated'} for all cameras`,
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'hikvision':
      case 'hikconnect':
        return '🏢';
      case 'manual':
        return '⚙️';
      default:
        return '📹';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Camera AI Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI assistance for individual cameras and groups
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="global-ai">Global AI</Label>
          <Switch
            id="global-ai"
            checked={globalAI}
            onCheckedChange={toggleGlobalAI}
          />
        </div>
      </div>

      <Tabs defaultValue="by-source" className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-source">By Source</TabsTrigger>
          <TabsTrigger value="by-status">By Status</TabsTrigger>
          <TabsTrigger value="ai-enabled">AI Enabled</TabsTrigger>
        </TabsList>

        <TabsContent value="by-source" className="space-y-4">
          {cameraGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSourceIcon(group.source)}</span>
                    {group.name}
                    <Badge variant="outline">{group.cameras.length} cameras</Badge>
                  </div>
                  {group.account && (
                    <Badge variant="secondary" className="text-xs">
                      {group.account}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Source: {group.source} • {group.cameras.filter(c => c.status === 'online').length} online
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.cameras.map((camera) => (
                    <div
                      key={camera.id}
                      className="p-4 border border-border rounded-lg bg-card/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <span className="font-medium">{camera.name}</span>
                          <Badge 
                            variant={camera.status === 'online' ? 'default' : 'secondary'}
                            className={camera.status === 'online' ? 'bg-green-600' : ''}
                          >
                            {camera.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Brain className={`h-4 w-4 ${camera.aiEnabled ? 'text-jericho-accent' : 'text-gray-400'}`} />
                          <Switch
                            checked={camera.aiEnabled}
                            onCheckedChange={(checked) => 
                              updateCameraAI(group.id, camera.id, { aiEnabled: checked })
                            }
                          />
                        </div>
                      </div>

                      {camera.aiEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Detection Types</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detectionOptions.map((type) => (
                                <Badge
                                  key={type}
                                  variant={camera.detectionTypes.includes(type) ? 'default' : 'outline'}
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    const newTypes = camera.detectionTypes.includes(type)
                                      ? camera.detectionTypes.filter(t => t !== type)
                                      : [...camera.detectionTypes, type];
                                    updateCameraAI(group.id, camera.id, { detectionTypes: newTypes });
                                  }}
                                >
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs">Confidence: {camera.confidence}%</Label>
                            <Select
                              value={camera.confidence.toString()}
                              onValueChange={(value) => 
                                updateCameraAI(group.id, camera.id, { confidence: parseInt(value) })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="50">50% - Low</SelectItem>
                                <SelectItem value="65">65% - Medium</SelectItem>
                                <SelectItem value="75">75% - High</SelectItem>
                                <SelectItem value="85">85% - Very High</SelectItem>
                                <SelectItem value="95">95% - Maximum</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Alerts</Label>
                            <Switch
                              checked={camera.alertsEnabled}
                              onCheckedChange={(checked) => 
                                updateCameraAI(group.id, camera.id, { alertsEnabled: checked })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="by-status" className="space-y-4">
          {['online', 'offline'].map((status) => {
            const camerasWithStatus = cameraGroups.flatMap(group => 
              group.cameras
                .filter(cam => cam.status === status)
                .map(cam => ({ ...cam, groupName: group.name, groupId: group.id }))
            );

            return (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {status.charAt(0).toUpperCase() + status.slice(1)} Cameras
                    <Badge variant="outline">{camerasWithStatus.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {camerasWithStatus.map((camera) => (
                      <div key={`${camera.groupId}-${camera.id}`} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium text-sm">{camera.name}</div>
                          <div className="text-xs text-muted-foreground">{camera.groupName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Brain className={`h-4 w-4 ${camera.aiEnabled ? 'text-jericho-accent' : 'text-gray-400'}`} />
                          <Switch
                            checked={camera.aiEnabled}
                            onCheckedChange={(checked) => 
                              updateCameraAI(camera.groupId, camera.id, { aiEnabled: checked })
                            }
                            disabled={status === 'offline'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="ai-enabled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-jericho-accent" />
                AI-Enabled Cameras
              </CardTitle>
              <CardDescription>
                Cameras currently using AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cameraGroups.flatMap(group => 
                  group.cameras
                    .filter(cam => cam.aiEnabled)
                    .map(cam => ({ ...cam, groupName: group.name, groupId: group.id }))
                ).map((camera) => (
                  <div key={`${camera.groupId}-${camera.id}`} className="p-3 border rounded-lg bg-card/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{camera.name}</div>
                        <div className="text-sm text-muted-foreground">{camera.groupName}</div>
                        <div className="flex gap-1 mt-1">
                          {camera.detectionTypes.map(type => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">Confidence: {camera.confidence}%</div>
                        <div className="text-xs text-muted-foreground">
                          Alerts: {camera.alertsEnabled ? 'ON' : 'OFF'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
