
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, Mic, AlertTriangle, Zap, Settings, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIConfig {
  motionDetection: {
    enabled: boolean;
    sensitivity: number;
    objectTypes: string[];
    zones: string[];
  };
  facialRecognition: {
    enabled: boolean;
    confidence: number;
    unknownPersonAlert: boolean;
    knownPersonsList: string[];
  };
  voiceCommands: {
    enabled: boolean;
    language: string;
    wakeWord: string;
  };
  anomalyDetection: {
    enabled: boolean;
    learningPeriod: number;
    alertThreshold: number;
  };
  smartAlerts: {
    enabled: boolean;
    falsePositiveReduction: boolean;
    timeBasedFiltering: boolean;
    notificationDelay: number;
  };
}

export const EnhancedAISettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    motionDetection: {
      enabled: false,
      sensitivity: 50,
      objectTypes: [],
      zones: []
    },
    facialRecognition: {
      enabled: false,
      confidence: 85,
      unknownPersonAlert: true,
      knownPersonsList: []
    },
    voiceCommands: {
      enabled: false,
      language: 'en-US',
      wakeWord: 'Jericho'
    },
    anomalyDetection: {
      enabled: false,
      learningPeriod: 7,
      alertThreshold: 75
    },
    smartAlerts: {
      enabled: false,
      falsePositiveReduction: true,
      timeBasedFiltering: true,
      notificationDelay: 5
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedConfig = localStorage.getItem('jericho-enhanced-ai-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('jericho-enhanced-ai-config', JSON.stringify(config));
      
      toast({
        title: "AI Settings Saved",
        description: "AI configuration has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save AI configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (section: keyof AIConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const objectTypes = ['person', 'vehicle', 'animal', 'package', 'face'];
  const languages = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Enhanced AI Integration</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure advanced AI features for intelligent security monitoring
          </p>
        </div>
        <Button onClick={saveConfig} disabled={isSaving} className="jericho-btn-primary">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs defaultValue="motion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="motion">Motion AI</TabsTrigger>
          <TabsTrigger value="facial">Facial Recognition</TabsTrigger>
          <TabsTrigger value="voice">Voice Commands</TabsTrigger>
          <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="motion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Intelligent Motion Detection
              </CardTitle>
              <CardDescription>
                AI-powered object detection and classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="motion-enabled">Enable AI Motion Detection</Label>
                <Switch
                  id="motion-enabled"
                  checked={config.motionDetection.enabled}
                  onCheckedChange={(checked) => updateConfig('motionDetection', 'enabled', checked)}
                />
              </div>

              {config.motionDetection.enabled && (
                <>
                  <div>
                    <Label>Detection Sensitivity: {config.motionDetection.sensitivity}%</Label>
                    <Slider
                      value={[config.motionDetection.sensitivity]}
                      onValueChange={(value) => updateConfig('motionDetection', 'sensitivity', value[0])}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Object Types to Detect</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {objectTypes.map((type) => (
                        <Badge
                          key={type}
                          variant={config.motionDetection.objectTypes.includes(type) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const current = config.motionDetection.objectTypes;
                            const updated = current.includes(type)
                              ? current.filter(t => t !== type)
                              : [...current, type];
                            updateConfig('motionDetection', 'objectTypes', updated);
                          }}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Facial Recognition System
              </CardTitle>
              <CardDescription>
                Identify known individuals and alert on strangers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="facial-enabled">Enable Facial Recognition</Label>
                <Switch
                  id="facial-enabled"
                  checked={config.facialRecognition.enabled}
                  onCheckedChange={(checked) => updateConfig('facialRecognition', 'enabled', checked)}
                />
              </div>

              {config.facialRecognition.enabled && (
                <>
                  <div>
                    <Label>Recognition Confidence: {config.facialRecognition.confidence}%</Label>
                    <Slider
                      value={[config.facialRecognition.confidence]}
                      onValueChange={(value) => updateConfig('facialRecognition', 'confidence', value[0])}
                      min={50}
                      max={99}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="unknown-alert">Alert on Unknown Persons</Label>
                    <Switch
                      id="unknown-alert"
                      checked={config.facialRecognition.unknownPersonAlert}
                      onCheckedChange={(checked) => updateConfig('facialRecognition', 'unknownPersonAlert', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Command Interface
              </CardTitle>
              <CardDescription>
                Control your security system with natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-enabled">Enable Voice Commands</Label>
                <Switch
                  id="voice-enabled"
                  checked={config.voiceCommands.enabled}
                  onCheckedChange={(checked) => updateConfig('voiceCommands', 'enabled', checked)}
                />
              </div>

              {config.voiceCommands.enabled && (
                <>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={config.voiceCommands.language}
                      onValueChange={(value) => updateConfig('voiceCommands', 'language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="wake-word">Wake Word</Label>
                    <Input
                      id="wake-word"
                      value={config.voiceCommands.wakeWord}
                      onChange={(e) => updateConfig('voiceCommands', 'wakeWord', e.target.value)}
                      placeholder="e.g., Jericho, Security"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomaly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Anomaly Detection Engine
              </CardTitle>
              <CardDescription>
                Machine learning to detect unusual patterns and behaviors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="anomaly-enabled">Enable Anomaly Detection</Label>
                <Switch
                  id="anomaly-enabled"
                  checked={config.anomalyDetection.enabled}
                  onCheckedChange={(checked) => updateConfig('anomalyDetection', 'enabled', checked)}
                />
              </div>

              {config.anomalyDetection.enabled && (
                <>
                  <div>
                    <Label>Learning Period: {config.anomalyDetection.learningPeriod} days</Label>
                    <Slider
                      value={[config.anomalyDetection.learningPeriod]}
                      onValueChange={(value) => updateConfig('anomalyDetection', 'learningPeriod', value[0])}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Alert Threshold: {config.anomalyDetection.alertThreshold}%</Label>
                    <Slider
                      value={[config.anomalyDetection.alertThreshold]}
                      onValueChange={(value) => updateConfig('anomalyDetection', 'alertThreshold', value[0])}
                      min={50}
                      max={99}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Smart Alert System
              </CardTitle>
              <CardDescription>
                Intelligent notification filtering and timing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="smart-alerts-enabled">Enable Smart Alerts</Label>
                <Switch
                  id="smart-alerts-enabled"
                  checked={config.smartAlerts.enabled}
                  onCheckedChange={(checked) => updateConfig('smartAlerts', 'enabled', checked)}
                />
              </div>

              {config.smartAlerts.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="false-positive">Reduce False Positives</Label>
                    <Switch
                      id="false-positive"
                      checked={config.smartAlerts.falsePositiveReduction}
                      onCheckedChange={(checked) => updateConfig('smartAlerts', 'falsePositiveReduction', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="time-filtering">Time-based Filtering</Label>
                    <Switch
                      id="time-filtering"
                      checked={config.smartAlerts.timeBasedFiltering}
                      onCheckedChange={(checked) => updateConfig('smartAlerts', 'timeBasedFiltering', checked)}
                    />
                  </div>

                  <div>
                    <Label>Notification Delay: {config.smartAlerts.notificationDelay} seconds</Label>
                    <Slider
                      value={[config.smartAlerts.notificationDelay]}
                      onValueChange={(value) => updateConfig('smartAlerts', 'notificationDelay', value[0])}
                      min={0}
                      max={60}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
