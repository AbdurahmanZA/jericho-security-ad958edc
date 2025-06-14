
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Settings, Save, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExtensionManager } from './sip/ExtensionManager';
import { SipLogs } from './sip/SipLogs';
import { DialingPlan } from './sip/DialingPlan';

interface SipConfig {
  serverIp: string;
  sipPort: string;
  rtpPortStart: string;
  rtpPortEnd: string;
  codec: string;
  realm: string;
  enabled: boolean;
}

export const SipSettings: React.FC = () => {
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    serverIp: '192.168.1.100',
    sipPort: '5060',
    rtpPortStart: '10000',
    rtpPortEnd: '20000',
    codec: 'g729',
    realm: 'jericho.local',
    enabled: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSipConfig();
    checkAsteriskStatus();
  }, []);

  const loadSipConfig = () => {
    const saved = localStorage.getItem('jericho-sip-config');
    if (saved) {
      setSipConfig(JSON.parse(saved));
    }
  };

  const saveSipConfig = () => {
    localStorage.setItem('jericho-sip-config', JSON.stringify(sipConfig));
    toast({
      title: "SIP Configuration Saved",
      description: "Asterisk configuration has been updated",
    });
  };

  const checkAsteriskStatus = () => {
    // Simulate checking Asterisk status
    setTimeout(() => {
      setIsConnected(sipConfig.enabled);
    }, 1000);
  };

  const toggleAsterisk = () => {
    const newEnabled = !sipConfig.enabled;
    setSipConfig(prev => ({ ...prev, enabled: newEnabled }));
    setIsConnected(newEnabled);
    
    toast({
      title: newEnabled ? "Asterisk Started" : "Asterisk Stopped",
      description: newEnabled ? "SIP server is now running" : "SIP server has been stopped",
      variant: newEnabled ? "default" : "destructive",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: text,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">SIP & VoIP Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Asterisk PBX with G729 codec for emergency calling
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
            {isConnected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          <Button
            onClick={toggleAsterisk}
            variant={isConnected ? "destructive" : "default"}
            className="jericho-btn-accent"
          >
            <Phone className="w-4 h-4 mr-2" />
            {isConnected ? 'Stop Asterisk' : 'Start Asterisk'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="server" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="server">Server Config</TabsTrigger>
          <TabsTrigger value="extensions">Extensions</TabsTrigger>
          <TabsTrigger value="dialing">Dialing Plan</TabsTrigger>
          <TabsTrigger value="logs">SIP Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="server">
          <Card className="p-6">
            <h4 className="font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Asterisk Server Configuration
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="serverIp">Server IP Address</Label>
                <Input
                  id="serverIp"
                  value={sipConfig.serverIp}
                  onChange={(e) => setSipConfig(prev => ({ ...prev, serverIp: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              
              <div>
                <Label htmlFor="sipPort">SIP Port</Label>
                <Input
                  id="sipPort"
                  value={sipConfig.sipPort}
                  onChange={(e) => setSipConfig(prev => ({ ...prev, sipPort: e.target.value }))}
                  placeholder="5060"
                />
              </div>
              
              <div>
                <Label htmlFor="rtpStart">RTP Port Start</Label>
                <Input
                  id="rtpStart"
                  value={sipConfig.rtpPortStart}
                  onChange={(e) => setSipConfig(prev => ({ ...prev, rtpPortStart: e.target.value }))}
                  placeholder="10000"
                />
              </div>
              
              <div>
                <Label htmlFor="rtpEnd">RTP Port End</Label>
                <Input
                  id="rtpEnd"
                  value={sipConfig.rtpPortEnd}
                  onChange={(e) => setSipConfig(prev => ({ ...prev, rtpPortEnd: e.target.value }))}
                  placeholder="20000"
                />
              </div>
              
              <div>
                <Label htmlFor="codec">Codec</Label>
                <Select
                  value={sipConfig.codec}
                  onValueChange={(value) => setSipConfig(prev => ({ ...prev, codec: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g729">G.729 (8kbps)</SelectItem>
                    <SelectItem value="g711a">G.711 A-law (64kbps)</SelectItem>
                    <SelectItem value="g711u">G.711 μ-law (64kbps)</SelectItem>
                    <SelectItem value="g722">G.722 (64kbps)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="realm">SIP Realm</Label>
                <Input
                  id="realm"
                  value={sipConfig.realm}
                  onChange={(e) => setSipConfig(prev => ({ ...prev, realm: e.target.value }))}
                  placeholder="jericho.local"
                />
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-yellow-800 dark:text-yellow-200">G729 Codec License</h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    G729 codec requires licensing for commercial use. This configuration is for testing purposes.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={saveSipConfig} className="jericho-btn-primary">
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="extensions">
          <ExtensionManager sipConfig={sipConfig} />
        </TabsContent>

        <TabsContent value="dialing">
          <DialingPlan />
        </TabsContent>

        <TabsContent value="logs">
          <SipLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};
