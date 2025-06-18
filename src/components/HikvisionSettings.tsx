
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Key, 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Camera,
  Settings,
  Users,
  Globe,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const HikvisionSettings: React.FC = () => {
  const [savedCredentials, setSavedCredentials] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load shared credentials from the same location as HikConnectIntegration
    const saved = localStorage.getItem('jericho-hikconnect-credentials');
    if (saved) {
      try {
        setSavedCredentials(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    }
  }, []);

  const hasCredentials = savedCredentials?.appKey && savedCredentials?.appSecret;
  const isConnected = savedCredentials?.accessToken && !isTokenExpired();

  function isTokenExpired(): boolean {
    if (!savedCredentials?.tokenExpiry) return true;
    return Date.now() >= savedCredentials.tokenExpiry;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cloud className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Hikvision Cloud Integration</h3>
            <p className="text-sm text-muted-foreground">
              Manage Hikvision cloud accounts and camera settings
            </p>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
          {isConnected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>API Credentials Required</AlertTitle>
        <AlertDescription>
          To use Hikvision cloud features, please configure your API credentials in the 
          <strong> Hik-Connect Integration</strong> tab. Once configured, those credentials 
          will be used across all Hikvision cloud services.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts">Cloud Accounts</TabsTrigger>
          <TabsTrigger value="devices">Device Management</TabsTrigger>
          <TabsTrigger value="settings">Cloud Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Cloud Account Status</span>
              </CardTitle>
              <CardDescription>
                Monitor your Hikvision cloud account connection and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasCredentials ? (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    No API credentials configured. Please go to the 
                    <strong> Hik-Connect Integration</strong> tab to set up your AppKey and AppSecret.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Primary Account</h4>
                        <p className="text-sm text-muted-foreground">
                          AppKey: {savedCredentials.appKey.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  {isConnected && savedCredentials.tokenExpiry && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Token expires:</strong> {new Date(savedCredentials.tokenExpiry).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Device Management</span>
              </CardTitle>
              <CardDescription>
                Advanced device configuration and management options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center text-muted-foreground py-8">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Connect to Hikvision cloud to manage devices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Device management features are available through the 
                      <strong> Hik-Connect Integration</strong> tab, including live streaming, 
                      event monitoring, and PTZ control.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Cloud Settings</span>
              </CardTitle>
              <CardDescription>
                Configure cloud service preferences and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Default Stream Quality</Label>
                  <select className="w-full p-2 border rounded-md mt-1">
                    <option value="HD">HD (High Definition)</option>
                    <option value="SD">SD (Standard Definition)</option>
                  </select>
                </div>
                
                <div>
                  <Label>Default Stream Protocol</Label>
                  <select className="w-full p-2 border rounded-md mt-1">
                    <option value="hls">HLS (HTTP Live Streaming)</option>
                    <option value="rtmp">RTMP (Real-Time Messaging Protocol)</option>
                    <option value="rtsp">RTSP (Real Time Streaming Protocol)</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Regional Settings</h4>
                  <div>
                    <Label>API Region</Label>
                    <select className="w-full p-2 border rounded-md mt-1">
                      <option value="global">Global (open.ys7.com)</option>
                      <option value="china">China (open.ys7.com.cn)</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
