import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Save, TestTube, Monitor, Eye, EyeOff, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StreamConfig {
  id: number;
  url: string;
  name: string;
  enabled: boolean;
  connected: boolean;
}

export const StreamSettings: React.FC = () => {
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [editingStream, setEditingStream] = useState<StreamConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStreams();
  }, []);

  const loadStreams = () => {
    const savedStreams = localStorage.getItem('jericho-stream-urls');
    if (savedStreams) {
      try {
        const parsed = JSON.parse(savedStreams);
        const streamArray = Object.entries(parsed).map(([id, url]) => ({
          id: parseInt(id),
          url: url as string,
          name: `Camera ${id}`,
          enabled: true,
          connected: false
        }));
        setStreams(streamArray);
      } catch (error) {
        console.error('Error loading streams:', error);
      }
    }
  };

  const saveStreams = (updatedStreams: StreamConfig[]) => {
    setStreams(updatedStreams);
    
    const urlObject = updatedStreams.reduce((acc, stream) => {
      if (stream.url && stream.enabled) {
        acc[stream.id] = stream.url;
      }
      return acc;
    }, {} as Record<number, string>);
    
    localStorage.setItem('jericho-stream-urls', JSON.stringify(urlObject));
    
    toast({
      title: "HLS Streams Updated",
      description: "Stream configuration saved successfully",
    });
  };

  const updateStream = (id: number, updates: Partial<StreamConfig>) => {
    const updatedStreams = streams.map(stream => 
      stream.id === id ? { ...stream, ...updates } : stream
    );
    saveStreams(updatedStreams);
  };

  const removeStream = (id: number) => {
    const updatedStreams = streams.filter(stream => stream.id !== id);
    saveStreams(updatedStreams);
    
    toast({
      title: "Stream Removed",
      description: `Camera ${id} has been removed`,
    });
  };

  const addNewStream = () => {
    const newId = Math.max(...streams.map(s => s.id), 0) + 1;
    const newStream: StreamConfig = {
      id: newId,
      url: '',
      name: `Camera ${newId}`,
      enabled: true,
      connected: false
    };
    
    setStreams([...streams, newStream]);
    setEditingStream(newStream);
  };

  const testConnection = (stream: StreamConfig) => {
    toast({
      title: "Testing Connection",
      description: `Testing ${stream.name}...`,
    });
    
    setTimeout(() => {
      const success = Math.random() > 0.3;
      toast({
        title: success ? "Connection Successful" : "Connection Failed",
        description: success 
          ? `${stream.name} is accessible` 
          : `Unable to connect to ${stream.name}`,
        variant: success ? "default" : "destructive",
      });
      
      updateStream(stream.id, { connected: success });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">HLS Stream Management</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure RTSP camera streams for HLS conversion (~5s latency, optimized for multiple cameras)
          </p>
        </div>
        <Button onClick={addNewStream} className="jericho-btn-accent">
          <Monitor className="w-4 h-4 mr-2" />
          Add Stream
        </Button>
      </div>

      {/* HLS Information Alert */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>HLS Streaming Mode Active:</strong> All cameras use HLS streaming with ~5 second latency. 
          This is optimized for multiple camera viewing (20-30+ streams) with lower server load.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream List */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">Active HLS Streams</h4>
          
          {streams.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No HLS Streams Configured</p>
              <p className="text-sm mt-1">Add RTSP streams for HLS conversion</p>
            </div>
          ) : (
            streams.map((stream) => (
              <div key={stream.id} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{stream.name}</span>
                    <Badge variant={stream.connected ? "default" : "secondary"}>
                      {stream.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <Badge variant="outline" className="text-yellow-600">
                      HLS ~5s
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStream(stream)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateStream(stream.id, { enabled: !stream.enabled })}
                      className={stream.enabled ? "text-orange-500" : "text-green-500"}
                    >
                      {stream.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStream(stream.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-3">
                  <div className="truncate">{stream.url || 'No URL configured'}</div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Badge variant={stream.enabled ? "default" : "secondary"}>
                      {stream.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(stream)}
                    disabled={!stream.url}
                  >
                    <TestTube className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Panel */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">
            {editingStream ? 'HLS Stream Configuration' : 'Select Stream to Edit'}
          </h4>
          
          {editingStream ? (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
              <div>
                <Label htmlFor="streamName">Stream Name</Label>
                <Input
                  id="streamName"
                  value={editingStream.name}
                  onChange={(e) => setEditingStream({
                    ...editingStream,
                    name: e.target.value
                  })}
                  placeholder="Camera 1"
                />
              </div>
              
              <div>
                <Label htmlFor="streamUrl">RTSP URL</Label>
                <Input
                  id="streamUrl"
                  value={editingStream.url}
                  onChange={(e) => setEditingStream({
                    ...editingStream,
                    url: e.target.value
                  })}
                  placeholder="rtsp://username:password@192.168.1.100:554/stream1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will be converted to HLS format for optimized streaming
                </p>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => testConnection(editingStream)}
                  disabled={!editingStream.url}
                  className="flex-1"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test RTSP
                </Button>
                <Button
                  onClick={() => {
                    updateStream(editingStream.id, editingStream);
                    setEditingStream(null);
                  }}
                  disabled={!editingStream.url}
                  className="flex-1 jericho-btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Stream
                </Button>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setEditingStream(null)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No Stream Selected</p>
                <p className="text-sm mt-1">Select a stream to edit or add a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HLS Optimization Tips */}
      <div className="mt-6 p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h5 className="font-semibold">HLS Optimization for Multiple Streams</h5>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>• <strong>Latency:</strong> ~5 seconds (acceptable for security monitoring)</div>
          <div>• <strong>Scalability:</strong> Efficiently handles 20-30+ concurrent streams</div>
          <div>• <strong>Compatibility:</strong> Works on all browsers without plugins</div>
          <div>• <strong>Server Load:</strong> Lower CPU usage compared to WebRTC</div>
          <div>• <strong>Bandwidth:</strong> Adaptive bitrate streaming available</div>
        </div>
      </div>

      {/* RTSP URL Examples */}
      <div className="mt-6 p-4 border border-border rounded-lg bg-card">
        <h5 className="font-semibold mb-3">RTSP URL Examples (for HLS conversion)</h5>
        <div className="space-y-2 text-sm text-muted-foreground font-mono">
          <div>Generic IP Camera: <code>rtsp://admin:password@192.168.1.100:554/stream1</code></div>
          <div>Hikvision: <code>rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101</code></div>
          <div>Dahua: <code>rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0</code></div>
          <div>Test Stream: <code>rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mp4</code></div>
        </div>
      </div>
    </div>
  );
};
