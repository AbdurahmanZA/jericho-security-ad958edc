
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Camera, Brain, MessageSquare, Settings, Users, Shield, Mic, Database, Terminal } from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const kbSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      articles: [
        {
          title: 'System Overview',
          content: `Jericho Security System is a comprehensive AI-powered security platform that integrates with multiple camera sources including Hikvision devices, manual RTSP streams, and various IP cameras.

Key Features:
• Multi-camera management with live streaming
• AI-powered object and motion detection
• Discord integration for real-time alerts
• Multi-user access control with role-based permissions
• Backup and restore functionality
• SIP/VoIP integration for audio communications`
        },
        {
          title: 'First Time Setup',
          content: `1. Login with your credentials (default: admin/admin)
2. Navigate to Settings → Cameras to add your first camera
3. Configure AI settings in Settings → AI System
4. Set up Discord notifications in Settings → Integrations
5. Add additional users in Settings → Users (superuser only)

Important: Change default passwords immediately after first login.`
        }
      ]
    },
    {
      id: 'cameras',
      title: 'Camera Management',
      icon: Camera,
      articles: [
        {
          title: 'Adding Cameras',
          content: `Camera Sources Supported:
• Manual RTSP Streams (rtsp://user:pass@ip:port/path)
• Hikvision HikConnect Integration
• Local IP Cameras
• USB Cameras (limited support)

Multiple Camera Setup:
1. Go to Camera View → Add Multiple Cameras
2. Choose between Manual Setup or Hikvision Integration
3. Configure each camera with name and stream URL
4. Test connection before saving

Camera Grouping:
Cameras are automatically grouped by:
• Source Type (Manual, Hikvision, etc.)
• Account (for multi-account setups)
• Status (Online/Offline)`
        },
        {
          title: 'Camera AI Settings',
          content: `AI Processing per Camera:
• Toggle AI assistance on/off per camera
• Configure detection types (person, vehicle, animal)
• Set confidence thresholds
• Enable/disable alerts for specific events

AI Features:
• Motion Detection with object classification
• Facial Recognition (known vs unknown persons)
• Anomaly Detection based on learned patterns
• Smart Alert filtering to reduce false positives`
        }
      ]
    },
    {
      id: 'ai-integration',
      title: 'AI Integration',
      icon: Brain,
      articles: [
        {
          title: 'AI Configuration',
          content: `Enhanced AI Settings:

Motion Detection AI:
• Sensitivity: 1-100% (higher = more sensitive)
• Object Types: person, vehicle, animal, package, face
• Detection Zones: Define specific areas to monitor

Facial Recognition:
• Confidence Level: 50-99% (higher = more accurate)
• Unknown Person Alerts: Immediate notifications
• Known Persons Database: Upload and manage known faces

Voice Commands:
• Wake Word: "Jericho" (customizable)
• Supported Languages: English, Spanish, French, German
• Commands: "Show camera 1", "Enable alerts", "Disable AI"

Anomaly Detection:
• Learning Period: 1-30 days
• Alert Threshold: 50-99%
• Automatically learns normal patterns`
        },
        {
          title: 'AI Model Configuration',
          content: `Available AI Models:
• COCO-SSD: 27MB, Good accuracy, Fast speed
• YOLOv5 Small: 14MB, Good accuracy, Very fast
• YOLOv5 Medium: 42MB, Better accuracy, Fast

Model Selection Guidelines:
• CPU Only: COCO-SSD recommended
• GPU Available: YOLOv5 Medium for best accuracy
• Low Bandwidth: YOLOv5 Small

Processing Settings:
• Confidence Threshold: 0.1-1.0
• Max Detections: 1-50 objects per frame
• Processing Interval: 1-60 seconds
• Enabled Classes: Select which objects to detect`
        }
      ]
    },
    {
      id: 'discord',
      title: 'Discord Integration',
      icon: MessageSquare,
      articles: [
        {
          title: 'Setting Up Discord Webhooks',
          content: `Creating Discord Webhooks:
1. Go to your Discord server settings
2. Select "Integrations" → "Webhooks"
3. Click "New Webhook"
4. Name your webhook (e.g., "Jericho Security")
5. Select the channel for notifications
6. Copy the webhook URL

Adding to Jericho:
1. Settings → Integrations → Discord Integration
2. Click "Add Discord Webhook"
3. Enter webhook name and URL
4. Select event types to receive
5. Test the connection

Event Types:
• motion-detected: General motion alerts
• person-detected: Human presence detected
• vehicle-detected: Vehicle in view
• unknown-person: Unrecognized individual
• system-alert: System status changes
• anomaly-detected: Unusual behavior patterns
• camera-offline: Camera connection lost`
        },
        {
          title: 'Alert Customization',
          content: `Message Customization:
• Alert severity levels (low, medium, high, critical)
• Camera-specific information included
• Timestamp and confidence scores
• Custom test messages

Smart Filtering:
• False Positive Reduction: AI-powered filtering
• Time-based Filtering: Schedule quiet hours
• Notification Delay: Prevent spam alerts
• Event Correlation: Group related events`
        }
      ]
    },
    {
      id: 'users',
      title: 'User Management',
      icon: Users,
      articles: [
        {
          title: 'User Roles and Permissions',
          content: `User Roles:
• Superuser: Full system access
• Admin: Camera and AI management
• Operator: View cameras and basic settings
• Viewer: Read-only camera access

Permission Modules:
• cameras: Camera management and viewing
• settings: System configuration
• integrations: Third-party services
• ai: AI configuration and models
• users: User and role management
• sip: VoIP and communication settings
• scripts: Installation and maintenance
• backup: System backup and restore

Password Management:
• Minimum 8 characters required
• Change passwords in Settings → Profile
• Superusers can reset other user passwords`
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: Shield,
      articles: [
        {
          title: 'Common Issues',
          content: `Camera Connection Issues:
• Verify RTSP URL format: rtsp://user:pass@ip:port/path
• Check network connectivity
• Ensure camera credentials are correct
• Test with VLC or similar player first

AI Not Working:
• Check browser compatibility (Chrome/Edge recommended)
• Ensure sufficient RAM (4GB+ recommended)
• Verify AI model is downloaded
• Check console for JavaScript errors

Discord Alerts Not Sending:
• Verify webhook URL is correct
• Check webhook permissions in Discord
• Ensure event types are selected
• Test webhook with manual test message

Performance Issues:
• Reduce AI processing interval
• Lower camera resolution/quality
• Limit number of simultaneous streams
• Check network bandwidth usage`
        }
      ]
    }
  ];

  const filteredSections = kbSections.map(section => ({
    ...section,
    articles: section.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold uppercase tracking-wide">Knowledge Base</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Complete documentation for Jericho Security System
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="getting-started" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {kbSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex items-center gap-1 text-xs"
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(searchTerm ? filteredSections : kbSections).map((section) => (
          <TabsContent key={section.id} value={section.id}>
            <div className="space-y-4">
              {section.articles.map((article, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <section.icon className="h-5 w-5" />
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-sm">
                      {article.content.split('\n').map((line, lineIndex) => {
                        if (line.startsWith('•')) {
                          return (
                            <div key={lineIndex} className="ml-4 mb-1">
                              <span className="text-jericho-accent">•</span> {line.substring(1)}
                            </div>
                          );
                        }
                        if (line.endsWith(':')) {
                          return (
                            <h4 key={lineIndex} className="font-semibold mt-4 mb-2">
                              {line}
                            </h4>
                          );
                        }
                        if (line.trim() === '') {
                          return <br key={lineIndex} />;
                        }
                        return (
                          <p key={lineIndex} className="mb-2">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
