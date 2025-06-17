
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Download, Play, Square, Settings, Cpu, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIModel {
  id: string;
  name: string;
  type: 'yolo' | 'mobilenet' | 'coco-ssd';
  size: string;
  accuracy: string;
  speed: string;
  downloaded: boolean;
  enabled: boolean;
}

interface AIConfig {
  enabled: boolean;
  confidence: number;
  maxDetections: number;
  enabledClasses: string[];
  model: string;
  processInterval: number;
}

export const AISettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    confidence: 0.5,
    maxDetections: 10,
    enabledClasses: ['person', 'car', 'truck', 'bicycle', 'dog', 'cat'],
    model: 'coco-ssd',
    processInterval: 5
  });

  const [models, setModels] = useState<AIModel[]>([
    {
      id: 'coco-ssd',
      name: 'COCO-SSD',
      type: 'coco-ssd',
      size: '27MB',
      accuracy: 'Good',
      speed: 'Fast',
      downloaded: false,
      enabled: true
    },
    {
      id: 'yolov5s',
      name: 'YOLOv5 Small',
      type: 'yolo',
      size: '14MB',
      accuracy: 'Good',
      speed: 'Very Fast',
      downloaded: false,
      enabled: false
    },
    {
      id: 'yolov5m',
      name: 'YOLOv5 Medium',
      type: 'yolo',
      size: '42MB',
      accuracy: 'Better',
      speed: 'Fast',
      downloaded: false,
      enabled: false
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const detectableClasses = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
    'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
    'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
    'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase'
  ];

  useEffect(() => {
    loadConfig();
    loadModelStates();
  }, []);

  const loadConfig = () => {
    const savedConfig = localStorage.getItem('jericho-ai-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  const loadModelStates = () => {
    const savedModels = localStorage.getItem('jericho-ai-models');
    if (savedModels) {
      setModels(JSON.parse(savedModels));
    }
  };

  const saveModelStates = (updatedModels: AIModel[]) => {
    setModels(updatedModels);
    localStorage.setItem('jericho-ai-models', JSON.stringify(updatedModels));
  };

  const saveConfig = (newConfig: AIConfig) => {
    setConfig(newConfig);
    localStorage.setItem('jericho-ai-config', JSON.stringify(newConfig));
    toast({
      title: "AI Settings Saved",
      description: "Configuration has been updated",
    });
  };

  const downloadModel = async (modelId: string) => {
    setDownloadingModels(prev => new Set([...prev, modelId]));
    
    toast({
      title: "Downloading Model",
      description: `Starting download of ${modelId}...`,
    });

    // Simulate download process
    await new Promise(resolve => setTimeout(resolve, 3000));

    const updatedModels = models.map(model => 
      model.id === modelId 
        ? { ...model, downloaded: true }
        : model
    );

    saveModelStates(updatedModels);
    setDownloadingModels(prev => {
      const newSet = new Set(prev);
      newSet.delete(modelId);
      return newSet;
    });

    toast({
      title: "Model Downloaded",
      description: `${modelId} is ready for use`,
    });
  };

  const toggleProcessing = () => {
    setIsProcessing(!isProcessing);
    toast({
      title: isProcessing ? "AI Processing Stopped" : "AI Processing Started",
      description: isProcessing ? "Object detection paused" : "Now analyzing camera feeds",
    });
  };

  const getAvailableModels = () => {
    return models.filter(model => model.downloaded);
  };

  const getCurrentModel = () => {
    return models.find(model => model.id === config.model);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">AI Object Recognition</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI models for automated object detection in camera feeds
          </p>
        </div>
        <Button
          onClick={toggleProcessing}
          variant={isProcessing ? "destructive" : "default"}
          className={isProcessing ? "" : "jericho-btn-accent"}
        >
          {isProcessing ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop Processing
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Processing
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Selection */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide flex items-center">
            <Brain className="w-4 h-4 mr-2 text-jericho-accent" />
            Available Models
          </h4>
          
          {/* Current Model Display */}
          {getCurrentModel() && (
            <div className="p-4 border-2 border-jericho-accent rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-jericho-accent">Current Model:</span>
                  <span className="font-medium">{getCurrentModel()?.name}</span>
                  <Badge variant="default" className="bg-jericho-accent">Active</Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {getCurrentModel()?.size} • {getCurrentModel()?.accuracy} accuracy • {getCurrentModel()?.speed} speed
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {models.map((model) => (
              <div key={model.id} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{model.name}</span>
                    <Badge variant="outline">{model.type.toUpperCase()}</Badge>
                    {model.id === config.model && (
                      <Badge variant="default" className="bg-green-600">Selected</Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {!model.downloaded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadModel(model.id)}
                        disabled={downloadingModels.has(model.id)}
                      >
                        {downloadingModels.has(model.id) ? (
                          <>
                            <div className="w-3 h-3 mr-1 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Downloaded
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>Size: {model.size}</div>
                  <div>Accuracy: {model.accuracy}</div>
                  <div>Speed: {model.speed}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <h5 className="font-semibold mb-3 flex items-center">
              <Cpu className="w-4 h-4 mr-2" />
              Local AI Hosting Recommendations
            </h5>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>CPU Only:</strong> COCO-SSD or YOLOv5s recommended</p>
              <p>• <strong>GPU Available:</strong> YOLOv5m for better accuracy</p>
              <p>• <strong>Memory:</strong> Minimum 4GB RAM recommended</p>
              <p>• <strong>Processing:</strong> Runs entirely in browser using TensorFlow.js</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide flex items-center">
            <Settings className="w-4 h-4 mr-2 text-jericho-accent" />
            Detection Settings
          </h4>
          
          <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={config.enabled}
                onCheckedChange={(checked) => 
                  saveConfig({ ...config, enabled: checked as boolean })
                }
              />
              <Label className="font-semibold">Enable AI Object Detection</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="confidence">Confidence Threshold</Label>
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.confidence}
                  onChange={(e) => saveConfig({ 
                    ...config, 
                    confidence: parseFloat(e.target.value) || 0.5 
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher = fewer false positives
                </p>
              </div>

              <div>
                <Label htmlFor="maxDetections">Max Detections</Label>
                <Input
                  id="maxDetections"
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxDetections}
                  onChange={(e) => saveConfig({ 
                    ...config, 
                    maxDetections: parseInt(e.target.value) || 10 
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Objects per frame
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={config.model}
                onValueChange={(value) => saveConfig({ ...config, model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableModels().length > 0 ? (
                    getAvailableModels().map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.size})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No models downloaded
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {getAvailableModels().length === 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  Download a model first to enable AI processing
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="interval">Processing Interval (seconds)</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="60"
                value={config.processInterval}
                onChange={(e) => saveConfig({ 
                  ...config, 
                  processInterval: parseInt(e.target.value) || 5 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How often to analyze frames
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold">Object Classes to Detect</h5>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border border-border rounded-lg">
              {detectableClasses.map(className => (
                <div key={className} className="flex items-center space-x-2">
                  <Checkbox
                    checked={config.enabledClasses.includes(className)}
                    onCheckedChange={(checked) => {
                      const newClasses = checked
                        ? [...config.enabledClasses, className]
                        : config.enabledClasses.filter(c => c !== className);
                      saveConfig({ ...config, enabledClasses: newClasses });
                    }}
                  />
                  <span className="text-sm capitalize">{className}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
