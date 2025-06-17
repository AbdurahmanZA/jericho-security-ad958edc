
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  Key, 
  Camera, 
  Play, 
  Calendar, 
  RotateCcw, 
  Image, 
  Cloud,
  Zap,
  Shield,
  Monitor,
  Database
} from 'lucide-react';

interface ApiEndpoint {
  name: string;
  method: 'GET' | 'POST';
  endpoint: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  parameters?: string[];
  response?: string;
  status: 'implemented' | 'available';
}

export const HikvisionApiEndpoints: React.FC = () => {
  const endpoints: ApiEndpoint[] = [
    // Authentication
    {
      name: 'Get Access Token',
      method: 'POST',
      endpoint: '/token/get',
      description: 'Obtain access token using AppKey and AppSecret',
      category: 'Authentication',
      icon: <Key className="w-4 h-4" />,
      parameters: ['appKey', 'appSecret'],
      response: 'accessToken, refreshToken, expireTime',
      status: 'implemented'
    },
    {
      name: 'Refresh Token',
      method: 'POST',
      endpoint: '/token/refresh',
      description: 'Refresh expired access token',
      category: 'Authentication',
      icon: <Key className="w-4 h-4" />,
      parameters: ['refreshToken'],
      response: 'accessToken, refreshToken, expireTime',
      status: 'implemented'
    },

    // Device Management
    {
      name: 'Get Device List',
      method: 'POST',
      endpoint: '/device/list',
      description: 'Retrieve list of all connected devices',
      category: 'Device Management',
      icon: <Camera className="w-4 h-4" />,
      parameters: ['pageStart', 'pageSize'],
      response: 'devices array with device info',
      status: 'implemented'
    },
    {
      name: 'Get Device Info',
      method: 'POST',
      endpoint: '/device/info',
      description: 'Get detailed information about specific device',
      category: 'Device Management',
      icon: <Monitor className="w-4 h-4" />,
      parameters: ['deviceSerial'],
      response: 'device details, capabilities, status',
      status: 'implemented'
    },
    {
      name: 'Get Device Capacity',
      method: 'POST',
      endpoint: '/device/capacity',
      description: 'Get device capabilities and supported features',
      category: 'Device Management',
      icon: <Database className="w-4 h-4" />,
      parameters: ['deviceSerial'],
      response: 'capacity info, supported functions',
      status: 'implemented'
    },
    {
      name: 'Set Device Encryption',
      method: 'POST',
      endpoint: '/device/encrypt/set',
      description: 'Enable or disable device video encryption',
      category: 'Device Management',
      icon: <Shield className="w-4 h-4" />,
      parameters: ['deviceSerial', 'enable', 'validateCode'],
      response: 'success status',
      status: 'implemented'
    },

    // Live Streaming
    {
      name: 'Get Live Address',
      method: 'POST',
      endpoint: '/live/address/get',
      description: 'Get live stream URL without starting stream',
      category: 'Live Streaming',
      icon: <Globe className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'protocol', 'quality'],
      response: 'stream URL',
      status: 'implemented'
    },
    {
      name: 'Start Live Stream',
      method: 'POST',
      endpoint: '/live/start',
      description: 'Start live video stream (HLS/RTMP/RTSP)',
      category: 'Live Streaming',
      icon: <Play className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'protocol', 'quality'],
      response: 'stream URL, session info',
      status: 'implemented'
    },
    {
      name: 'Stop Live Stream',
      method: 'POST',
      endpoint: '/live/stop',
      description: 'Stop active live video stream',
      category: 'Live Streaming',
      icon: <Play className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo'],
      response: 'success status',
      status: 'implemented'
    },

    // Event Management
    {
      name: 'Get Alarm List',
      method: 'POST',
      endpoint: '/alarm/list',
      description: 'Retrieve device alarm/event history',
      category: 'Event Management',
      icon: <Zap className="w-4 h-4" />,
      parameters: ['deviceSerial', 'startTime', 'endTime', 'alarmType', 'status'],
      response: 'alarms array with event details',
      status: 'implemented'
    },
    {
      name: 'Delete Alarm',
      method: 'POST',
      endpoint: '/alarm/delete',
      description: 'Delete specific alarm record',
      category: 'Event Management',
      icon: <Zap className="w-4 h-4" />,
      parameters: ['alarmId'],
      response: 'success status',
      status: 'implemented'
    },

    // PTZ Control
    {
      name: 'PTZ Control Start',
      method: 'POST',
      endpoint: '/device/ptz/start',
      description: 'Control PTZ camera movement',
      category: 'PTZ Control',
      icon: <RotateCcw className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'direction', 'action', 'speed'],
      response: 'success status',
      status: 'implemented'
    },
    {
      name: 'Set PTZ Preset',
      method: 'POST',
      endpoint: '/device/ptz/preset/set',
      description: 'Save current PTZ position as preset',
      category: 'PTZ Control',
      icon: <RotateCcw className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'presetName'],
      response: 'success status',
      status: 'implemented'
    },
    {
      name: 'Move to PTZ Preset',
      method: 'POST',
      endpoint: '/device/ptz/preset/move',
      description: 'Move PTZ camera to saved preset position',
      category: 'PTZ Control',
      icon: <RotateCcw className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'presetName'],
      response: 'success status',
      status: 'implemented'
    },

    // Image Capture
    {
      name: 'Capture Image',
      method: 'POST',
      endpoint: '/device/capture',
      description: 'Capture snapshot from camera',
      category: 'Image Capture',
      icon: <Image className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'quality'],
      response: 'image URL',
      status: 'implemented'
    },

    // Video Playback
    {
      name: 'Get Record List',
      method: 'POST',
      endpoint: '/video/file/list',
      description: 'Get list of recorded video files',
      category: 'Video Playback',
      icon: <Calendar className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'startTime', 'endTime', 'recType'],
      response: 'records array with video file info',
      status: 'implemented'
    },
    {
      name: 'Start Video Playback',
      method: 'POST',
      endpoint: '/video/play/start',
      description: 'Start playback of recorded video',
      category: 'Video Playback',
      icon: <Play className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'startTime', 'endTime', 'quality'],
      response: 'playback URL',
      status: 'implemented'
    },

    // Cloud Storage
    {
      name: 'Get Cloud Records',
      method: 'POST',
      endpoint: '/video/cloud/list',
      description: 'Get cloud-stored video recordings',
      category: 'Cloud Storage',
      icon: <Cloud className="w-4 h-4" />,
      parameters: ['deviceSerial', 'channelNo', 'startTime', 'endTime'],
      response: 'cloud records array',
      status: 'implemented'
    },

    // Device Information
    {
      name: 'Get Device Version',
      method: 'POST',
      endpoint: '/device/version',
      description: 'Get device firmware version information',
      category: 'Device Information',
      icon: <Monitor className="w-4 h-4" />,
      parameters: ['deviceSerial'],
      response: 'version info, firmware details',
      status: 'implemented'
    }
  ];

  const categories = [...new Set(endpoints.map(e => e.category))];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredEndpoints = selectedCategory === 'All' 
    ? endpoints 
    : endpoints.filter(e => e.category === selectedCategory);

  const getStatusBadge = (status: string) => {
    return status === 'implemented' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        ✓ Implemented
      </Badge>
    ) : (
      <Badge variant="secondary">
        Available
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    return (
      <Badge variant={method === 'POST' ? 'default' : 'secondary'}>
        {method}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-2">Hikvision API Endpoints</h3>
        <p className="text-sm text-muted-foreground">
          Complete overview of all available Hik-Connect API endpoints and their implementation status
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={selectedCategory === 'All' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('All')}
        >
          All ({endpoints.length})
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category} ({endpoints.filter(e => e.category === category).length})
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {filteredEndpoints.map((endpoint, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    {endpoint.icon}
                    <span>{endpoint.name}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getMethodBadge(endpoint.method)}
                    {getStatusBadge(endpoint.status)}
                  </div>
                </div>
                <CardDescription>{endpoint.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Endpoint:</div>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {endpoint.method} https://open.ys7.com/api/lapp{endpoint.endpoint}
                    </code>
                  </div>

                  {endpoint.parameters && (
                    <div>
                      <div className="text-sm font-medium mb-1">Parameters:</div>
                      <div className="flex flex-wrap gap-1">
                        {endpoint.parameters.map((param) => (
                          <Badge key={param} variant="outline" className="text-xs">
                            {param}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {endpoint.response && (
                    <div>
                      <div className="text-sm font-medium mb-1">Response:</div>
                      <div className="text-xs text-muted-foreground">
                        {endpoint.response}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {endpoint.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">Implementation Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Endpoints</div>
            <div className="text-2xl font-bold">{endpoints.length}</div>
          </div>
          <div>
            <div className="font-medium">Implemented</div>
            <div className="text-2xl font-bold text-green-600">
              {endpoints.filter(e => e.status === 'implemented').length}
            </div>
          </div>
          <div>
            <div className="font-medium">Categories</div>
            <div className="text-2xl font-bold">{categories.length}</div>
          </div>
          <div>
            <div className="font-medium">Coverage</div>
            <div className="text-2xl font-bold">100%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
