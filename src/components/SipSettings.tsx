
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Settings, Save, Copy, CheckCircle, XCircle, Info, Server } from 'lucide-react';
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

interface SipStatus {
  running: boolean;
  status: string;
  uptime: string;
}

export const SipSettings: React.FC = () => {
  const [sipConfig, setSipConfig] = useState<SipConfig>({
    serverIp: '192.168.1.100',
    sipPort: '5060',
    rtpPortStart: '10000',
    rtpPortEnd: '20000',
    codec: 'gsm',
    realm: 'jericho.local',
    enabled: false
  });
  const [sipStatus, setSipStatus] = useState<SipStatus>({
    running: false,
    status: 'stopped',
    uptime: 'Unknown'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSipConfig();
    checkAsteriskStatus();
    
    // Poll status every 10 seconds
    const interval = setInterval(checkAsteriskStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSipConfig = async () => {
    try {
      const response = await fetch('/api/sip/config');
      if (response.ok) {
        const config = await response.json();
        if (config) {
          setSipConfig({
            serverIp: config.server_ip || '192.168.1.100',
            sipPort: config.sip_port?.toString() || '5060',
            rtpPortStart: config.rtp_start?.toString() || '10000',
            rtpPortEnd: config.rtp_end?.toString() || '20000',
            codec: config.codec || 'gsm',
            realm: config.realm || 'jericho.local',
            enabled: Boolean(config.enabled)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load SIP config:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('jericho-sip-config');
      if (saved) {
        setSipConfig(JSON.parse(saved));
      }
    }
  };

  const saveSipConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sip/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverIp: sipConfig.serverIp,
          sipPort: parseInt(sipConfig.sipPort),
          rtpPortStart: parseInt(sipConfig.rtpPortStart),
          rtpPortEnd: parseInt(sipConfig.rtpPortEnd),
          codec: sipConfig.codec,
          realm: sipConfig.realm,
          enabled: sipConfig.enabled
        }),
      });

      if (response.ok) {
        localStorage.setItem('jericho-sip-config', JSON.stringify(sipConfig));
        toast({
          title: "SIP Configuration Saved",
          description: "FreePBX configuration has been updated",
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save SIP config:', error);
      toast({
        title: "Save Failed",
        description: "Could not save SIP configuration. Check backend connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAsteriskStatus = async () => {
    try {
      const response = await fetch('/api/sip/status');
      if (response.ok) {
        const status = await response.json();
        setSipStatus(status);
      }
    } catch (error) {
      console.error('Failed to check Asterisk status:', error);
      setSipStatus({
        running: false,
        status: 'unknown',
        uptime: 'Unknown'
      });
    }
  };

  const toggleAsterisk = async () => {
    setLoading(true);
    try {
      const endpoint = sipStatus.running ? '/api/sip/stop' : '/api/sip/start';
      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        const result = await response.json();
        checkAsteriskStatus(); // Refresh status
        
        toast({
          title: sipStatus.running ? "FreePBX Stopped" : "FreePBX Started",
          description: sipStatus.running ? "SIP server has been stopped" : "SIP server is now running",
          variant: sipStatus.running ? "destructive" : "default",
        });
      } else {
        throw new Error('Failed to toggle FreePBX');
      }
    } catch (error) {
      console.error('Failed to toggle FreePBX:', error);
      toast({
        title: "Operation Failed",
        description: "Could not control FreePBX service. Check backend connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reloadAsterisk = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sip/reload', { method: 'POST' });
      
      if (response.ok) {
        toast({
          title: "FreePBX Reloaded",
          description: "Configuration has been reloaded successfully",
        });
      } else {
        throw new Error('Failed to reload FreePBX');
      }
    } catch (error) {
      console.error('Failed to reload FreePBX:', error);
      toast({
        title: "Reload Failed",
        description: "Could not reload FreePBX configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          <h3 className="text-lg font-bold uppercase tracking-wide">FreePBX Integration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure FreePBX with GSM/G729 codec for emergency calling and VoIP communications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={sipStatus.running ? "default" : "secondary"} className="flex items-center space-x-1">
            {sipStatus.running ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            <span>{sipStatus.running ? 'Running' : 'Stopped'}</span>
          </Badge>
          <Button
            onClick={toggleAsterisk}
            disabled={loading}
            variant={sipStatus.running ? "destructive" : "default"}
            className="jericho-btn-accent"
          >
            <Phone className="w-4 h-4 mr-2" />
            {loading ? 'Please wait...' : (sipStatus.running ? 'Stop FreePBX' : 'Start FreePBX')}
          </Button>
          {sipStatus.running && (
            <Button
              onClick={reloadAsterisk}
              disabled={loading}
              variant="outline"
            >
              Reload Config
            </Button>
          )}
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
              <Server className="w-5 h-5 mr-2" />
              FreePBX Server Configuration
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
                    <SelectItem value="gsm">GSM (13kbps) - Recommended</SelectItem>
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

            {sipStatus.running && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p><strong>Status:</strong> {sipStatus.status}</p>
                  <p><strong>Uptime:</strong> {sipStatus.uptime}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-blue-800 dark:text-blue-200">FreePBX Integration</h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This configuration integrates with FreePBX for complete PBX functionality including extensions,
                    call routing, voicemail, and emergency dialing. GSM codec provides excellent voice quality 
                    with minimal bandwidth requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-green-800 dark:text-green-200">GSM Codec (Default)</h5>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    GSM codec provides excellent voice quality at 13kbps with built-in FreePBX support. No additional 
                    licensing required. Perfect for emergency communications with reliable compression and good audio quality.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={saveSipConfig} disabled={loading} className="jericho-btn-primary">
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Configuration'}
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
