
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiscordWebhook {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
}

export const DiscordIntegration: React.FC = () => {
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '' });
  const [testMessage, setTestMessage] = useState('Test message from Jericho Security System');
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const { toast } = useToast();

  const eventTypes = [
    'motion-detected',
    'person-detected',
    'vehicle-detected',
    'unknown-person',
    'system-alert',
    'anomaly-detected',
    'camera-offline',
    'system-startup'
  ];

  useEffect(() => {
    const savedWebhooks = localStorage.getItem('jericho-discord-webhooks');
    if (savedWebhooks) {
      setWebhooks(JSON.parse(savedWebhooks));
    }
  }, []);

  const saveWebhooks = (updatedWebhooks: DiscordWebhook[]) => {
    setWebhooks(updatedWebhooks);
    localStorage.setItem('jericho-discord-webhooks', JSON.stringify(updatedWebhooks));
  };

  const addWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and webhook URL",
        variant: "destructive",
      });
      return;
    }

    const webhook: DiscordWebhook = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      enabled: true,
      events: ['motion-detected', 'person-detected']
    };

    saveWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: '', url: '' });
    
    toast({
      title: "Webhook Added",
      description: `Discord webhook "${webhook.name}" has been added`,
    });
  };

  const removeWebhook = (id: string) => {
    const updatedWebhooks = webhooks.filter(w => w.id !== id);
    saveWebhooks(updatedWebhooks);
    
    toast({
      title: "Webhook Removed",
      description: "Discord webhook has been removed",
    });
  };

  const updateWebhook = (id: string, updates: Partial<DiscordWebhook>) => {
    const updatedWebhooks = webhooks.map(w => 
      w.id === id ? { ...w, ...updates } : w
    );
    saveWebhooks(updatedWebhooks);
  };

  const testWebhook = async (webhook: DiscordWebhook) => {
    setIsTesting(webhook.id);
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          embeds: [{
            title: "🔒 Jericho Security Test",
            description: testMessage,
            color: 0x00AE86,
            timestamp: new Date().toISOString(),
            footer: {
              text: "Jericho Security System"
            }
          }]
        }),
      });

      toast({
        title: "Test Message Sent",
        description: `Test message sent to ${webhook.name}. Check your Discord channel.`,
      });
    } catch (error) {
      console.error('Discord webhook test failed:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test message. Please check the webhook URL.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(null);
    }
  };

  const toggleEvent = (webhookId: string, event: string) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (!webhook) return;

    const events = webhook.events.includes(event)
      ? webhook.events.filter(e => e !== event)
      : [...webhook.events, event];

    updateWebhook(webhookId, { events });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold uppercase tracking-wide">Discord Integration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Discord webhooks to receive AI-powered security alerts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Discord Webhook
          </CardTitle>
          <CardDescription>
            Add a new Discord webhook to receive security notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhook-name">Webhook Name</Label>
              <Input
                id="webhook-name"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                placeholder="e.g., Security Alerts"
              />
            </div>
            <div>
              <Label htmlFor="webhook-url">Discord Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
          </div>
          <Button onClick={addWebhook} className="jericho-btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </CardContent>
      </Card>

      {webhooks.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">Configured Webhooks</h4>
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {webhook.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.enabled}
                      onCheckedChange={(enabled) => updateWebhook(webhook.id, { enabled })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook(webhook)}
                      disabled={isTesting === webhook.id}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isTesting === webhook.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeWebhook(webhook.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {webhook.url.substring(0, 50)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Event Types to Send</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {eventTypes.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Switch
                          id={`${webhook.id}-${event}`}
                          checked={webhook.events.includes(event)}
                          onCheckedChange={() => toggleEvent(webhook.id, event)}
                          disabled={!webhook.enabled}
                        />
                        <Label 
                          htmlFor={`${webhook.id}-${event}`}
                          className="text-sm"
                        >
                          {event.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Message</CardTitle>
          <CardDescription>
            Customize the test message sent to Discord webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="test-message">Test Message Content</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter test message..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
