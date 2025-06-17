
interface DiscordWebhook {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
}

interface SecurityEvent {
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  cameraId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export const discordService = {
  async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    const webhooks = this.getEnabledWebhooks();
    const relevantWebhooks = webhooks.filter(webhook => 
      webhook.events.includes(event.type)
    );

    if (relevantWebhooks.length === 0) {
      console.log('No Discord webhooks configured for event type:', event.type);
      return;
    }

    const embed = this.createSecurityEmbed(event);

    for (const webhook of relevantWebhooks) {
      try {
        await this.sendToWebhook(webhook.url, embed);
        console.log(`Security alert sent to Discord webhook: ${webhook.name}`);
      } catch (error) {
        console.error(`Failed to send to Discord webhook ${webhook.name}:`, error);
      }
    }
  },

  createSecurityEmbed(event: SecurityEvent) {
    const colors = {
      low: 0x00AE86,      // Jericho teal
      medium: 0xF59E0B,   // Orange
      high: 0xEF4444,     // Red
      critical: 0x991B1B  // Dark red
    };

    const emojis = {
      'motion-detected': '🚶',
      'person-detected': '👤',
      'vehicle-detected': '🚗',
      'unknown-person': '❓',
      'system-alert': '⚠️',
      'anomaly-detected': '🔍',
      'camera-offline': '📹',
      'system-startup': '🟢'
    };

    return {
      embeds: [{
        title: `${emojis[event.type] || '🔒'} ${event.title}`,
        description: event.description,
        color: colors[event.severity],
        timestamp: event.timestamp.toISOString(),
        fields: [
          ...(event.cameraId ? [{
            name: "Camera",
            value: event.cameraId,
            inline: true
          }] : []),
          {
            name: "Severity",
            value: event.severity.toUpperCase(),
            inline: true
          },
          {
            name: "Time",
            value: event.timestamp.toLocaleTimeString(),
            inline: true
          }
        ],
        footer: {
          text: "Jericho Security System",
          icon_url: "https://your-domain.com/favicon.ico"
        }
      }]
    };
  },

  async sendToWebhook(url: string, payload: any): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors',
      body: JSON.stringify(payload),
    });

    // Note: With no-cors mode, we can't check response status
    // The webhook will either work or fail silently
  },

  getEnabledWebhooks(): DiscordWebhook[] {
    try {
      const webhooks = localStorage.getItem('jericho-discord-webhooks');
      if (!webhooks) return [];
      
      const parsed: DiscordWebhook[] = JSON.parse(webhooks);
      return parsed.filter(webhook => webhook.enabled);
    } catch (error) {
      console.error('Failed to load Discord webhooks:', error);
      return [];
    }
  },

  // Helper method to trigger common security events
  async triggerMotionAlert(cameraId: string, details: string): Promise<void> {
    await this.sendSecurityAlert({
      type: 'motion-detected',
      title: 'Motion Detected',
      description: `Motion detected on camera ${cameraId}. ${details}`,
      timestamp: new Date(),
      cameraId,
      severity: 'medium'
    });
  },

  async triggerPersonDetected(cameraId: string, confidence: number): Promise<void> {
    await this.sendSecurityAlert({
      type: 'person-detected',
      title: 'Person Detected',
      description: `Person detected on camera ${cameraId} with ${confidence}% confidence`,
      timestamp: new Date(),
      cameraId,
      severity: 'high'
    });
  },

  async triggerUnknownPerson(cameraId: string): Promise<void> {
    await this.sendSecurityAlert({
      type: 'unknown-person',
      title: 'Unknown Person Alert',
      description: `Unknown person detected on camera ${cameraId}`,
      timestamp: new Date(),
      cameraId,
      severity: 'critical'
    });
  },

  async triggerSystemAlert(message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    await this.sendSecurityAlert({
      type: 'system-alert',
      title: 'System Alert',
      description: message,
      timestamp: new Date(),
      severity
    });
  }
};
