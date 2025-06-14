
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RotateCcw, Save, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BackupData {
  version: string;
  timestamp: string;
  cameras: any[];
  streams: any[];
  contacts: any[];
  aiSettings: any;
  systemSettings: any;
}

export const BackupRestore: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const generateBackup = (): BackupData => {
    const cameras = JSON.parse(localStorage.getItem('jericho-hikvision-cameras') || '[]');
    const streams = JSON.parse(localStorage.getItem('jericho-stream-urls') || '{}');
    const contacts = JSON.parse(localStorage.getItem('jericho-emergency-contacts') || '[]');
    const aiSettings = JSON.parse(localStorage.getItem('jericho-ai-settings') || '{}');
    const systemSettings = {
      theme: localStorage.getItem('theme') || 'dark',
      notifications: localStorage.getItem('jericho-notifications') || 'enabled'
    };

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      cameras,
      streams,
      contacts,
      aiSettings,
      systemSettings
    };
  };

  const exportBackup = async () => {
    setIsExporting(true);
    
    try {
      const backupData = generateBackup();
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jericho-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Backup Created",
        description: "System configuration exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to create backup file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);
      
      // Validate backup structure
      if (!backupData.version || !backupData.timestamp) {
        throw new Error('Invalid backup file format');
      }
      
      // Restore data
      if (backupData.cameras) {
        localStorage.setItem('jericho-hikvision-cameras', JSON.stringify(backupData.cameras));
      }
      if (backupData.streams) {
        localStorage.setItem('jericho-stream-urls', JSON.stringify(backupData.streams));
      }
      if (backupData.contacts) {
        localStorage.setItem('jericho-emergency-contacts', JSON.stringify(backupData.contacts));
      }
      if (backupData.aiSettings) {
        localStorage.setItem('jericho-ai-settings', JSON.stringify(backupData.aiSettings));
      }
      if (backupData.systemSettings) {
        if (backupData.systemSettings.theme) {
          localStorage.setItem('theme', backupData.systemSettings.theme);
        }
        if (backupData.systemSettings.notifications) {
          localStorage.setItem('jericho-notifications', backupData.systemSettings.notifications);
        }
      }
      
      toast({
        title: "Backup Restored",
        description: "System configuration imported successfully. Please refresh the page to see changes.",
      });
      
      // Reset file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to restore backup. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetToDefaults = () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset all settings to defaults? This action cannot be undone.'
    );
    
    if (confirmReset) {
      // Clear all Jericho-related localStorage
      const keysToRemove = [
        'jericho-hikvision-cameras',
        'jericho-stream-urls',
        'jericho-emergency-contacts',
        'jericho-ai-settings',
        'jericho-notifications'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to defaults. Please refresh the page.",
      });
    }
  };

  const getBackupStats = () => {
    const backup = generateBackup();
    return {
      cameras: backup.cameras.length,
      streams: Object.keys(backup.streams).length,
      contacts: backup.contacts.length,
      hasAI: Object.keys(backup.aiSettings).length > 0
    };
  };

  const stats = getBackupStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Backup & Restore</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Export and import your complete system configuration
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current System Status */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">Current System Status</h4>
          
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Configuration Summary
              </h5>
              <Badge variant="outline">Ready for Backup</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hikvision Cameras:</span>
                <Badge variant={stats.cameras > 0 ? "default" : "secondary"}>
                  {stats.cameras} configured
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">RTSP Streams:</span>
                <Badge variant={stats.streams > 0 ? "default" : "secondary"}>
                  {stats.streams} active
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Emergency Contacts:</span>
                <Badge variant={stats.contacts > 0 ? "default" : "secondary"}>
                  {stats.contacts} contacts
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">AI Settings:</span>
                <Badge variant={stats.hasAI ? "default" : "secondary"}>
                  {stats.hasAI ? 'Configured' : 'Not set'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              onClick={exportBackup}
              disabled={isExporting}
              className="w-full jericho-btn-primary"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Creating Backup...' : 'Export Backup'}
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importBackup}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                disabled={isImporting}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import Backup'}
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">Advanced Options</h4>
          
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="space-y-4">
              <div>
                <h5 className="font-semibold mb-2 flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Backup Information
                </h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Includes all camera configurations</p>
                  <p>• Saves RTSP stream settings</p>
                  <p>• Preserves emergency contacts</p>
                  <p>• Exports AI model settings</p>
                  <p>• Maintains user preferences</p>
                </div>
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex items-start space-x-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-yellow-700 dark:text-yellow-400">
                      Reset to Defaults
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      This will clear all configurations and return to factory settings
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={resetToDefaults}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All Settings
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-green-700 dark:text-green-400">
                  Backup Best Practices
                </h5>
                <div className="text-xs text-green-600 dark:text-green-300 mt-1 space-y-1">
                  <p>• Export backups regularly</p>
                  <p>• Store backup files securely</p>
                  <p>• Test restore process periodically</p>
                  <p>• Keep multiple backup versions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 border border-border rounded-lg bg-card">
        <h5 className="font-semibold mb-3">Backup File Format</h5>
        <div className="text-sm text-muted-foreground font-mono">
          <div>Filename: jericho-backup-YYYY-MM-DD.json</div>
          <div>Format: JSON with versioned schema</div>
          <div>Size: Typically 5-50KB depending on configuration</div>
          <div>Compatibility: Jericho Security System v1.0+</div>
        </div>
      </div>
    </div>
  );
};
