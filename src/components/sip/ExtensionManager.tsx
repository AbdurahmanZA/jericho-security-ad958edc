
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Copy, Phone, Settings, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Extension {
  id: string;
  number: string;
  name: string;
  secret: string;
  enabled: boolean;
  registered: boolean;
  lastSeen?: string;
}

interface SipConfig {
  serverIp: string;
  sipPort: string;
  realm: string;
}

interface ExtensionManagerProps {
  sipConfig: SipConfig;
}

export const ExtensionManager: React.FC<ExtensionManagerProps> = ({ sipConfig }) => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadExtensions();
    // Simulate checking extension status
    const interval = setInterval(checkExtensionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadExtensions = () => {
    const saved = localStorage.getItem('jericho-sip-extensions');
    if (saved) {
      setExtensions(JSON.parse(saved));
    } else {
      // Create default extensions
      const defaultExtensions: Extension[] = [
        {
          id: '1001',
          number: '1001',
          name: 'Security Desk',
          secret: generateSecret(),
          enabled: true,
          registered: false
        },
        {
          id: '1002',
          number: '1002',
          name: 'Emergency Line',
          secret: generateSecret(),
          enabled: true,
          registered: false
        }
      ];
      setExtensions(defaultExtensions);
      localStorage.setItem('jericho-sip-extensions', JSON.stringify(defaultExtensions));
    }
  };

  const saveExtensions = (newExtensions: Extension[]) => {
    setExtensions(newExtensions);
    localStorage.setItem('jericho-sip-extensions', JSON.stringify(newExtensions));
  };

  const generateSecret = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const checkExtensionStatus = () => {
    // Simulate random registration status
    setExtensions(prev => prev.map(ext => ({
      ...ext,
      registered: Math.random() > 0.7,
      lastSeen: ext.registered ? new Date().toLocaleTimeString() : ext.lastSeen
    })));
  };

  const createNewExtension = () => {
    const newExt: Extension = {
      id: Date.now().toString(),
      number: '',
      name: '',
      secret: generateSecret(),
      enabled: true,
      registered: false
    };
    setEditingExtension(newExt);
  };

  const saveExtension = () => {
    if (!editingExtension || !editingExtension.number || !editingExtension.name) {
      toast({
        title: "Missing Information",
        description: "Please fill in extension number and name",
        variant: "destructive",
      });
      return;
    }

    const existingIndex = extensions.findIndex(e => e.id === editingExtension.id);
    let updatedExtensions;
    
    if (existingIndex >= 0) {
      updatedExtensions = extensions.map(e => e.id === editingExtension.id ? editingExtension : e);
    } else {
      updatedExtensions = [...extensions, editingExtension];
    }
    
    saveExtensions(updatedExtensions);
    setEditingExtension(null);
    
    toast({
      title: "Extension Saved",
      description: `Extension ${editingExtension.number} configured successfully`,
    });
  };

  const deleteExtension = (extensionId: string) => {
    const updatedExtensions = extensions.filter(e => e.id !== extensionId);
    saveExtensions(updatedExtensions);
    
    toast({
      title: "Extension Removed",
      description: "Extension deleted successfully",
    });
  };

  const toggleSecret = (extensionId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [extensionId]: !prev[extensionId]
    }));
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description,
    });
  };

  const generateSoftphoneConfig = (extension: Extension) => {
    return `SIP Server: ${sipConfig.serverIp}:${sipConfig.sipPort}
Username: ${extension.number}
Password: ${extension.secret}
Domain: ${sipConfig.realm}
Display Name: ${extension.name}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold uppercase tracking-wide">Extension Management</h4>
        <Button onClick={createNewExtension} className="jericho-btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Extension
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extensions List */}
        <div className="space-y-4">
          <h5 className="font-medium">Active Extensions</h5>
          
          {extensions.map((extension) => (
            <Card key={extension.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant={extension.registered ? "default" : "secondary"}>
                    {extension.number}
                  </Badge>
                  <span className="font-medium">{extension.name}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingExtension(extension)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteExtension(extension.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={extension.registered ? "default" : "outline"}>
                    {extension.registered ? 'Registered' : 'Offline'}
                  </Badge>
                </div>
                {extension.lastSeen && (
                  <div className="flex items-center justify-between">
                    <span>Last Seen:</span>
                    <span>{extension.lastSeen}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Secret:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs">
                      {showSecrets[extension.id] ? extension.secret : '••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSecret(extension.id)}
                    >
                      {showSecrets[extension.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generateSoftphoneConfig(extension), 'Softphone configuration')}
                  className="w-full"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Softphone Config
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Extension Editor */}
        <div className="space-y-4">
          <h5 className="font-medium">
            {editingExtension ? 'Extension Configuration' : 'Select Extension to Edit'}
          </h5>
          
          {editingExtension ? (
            <Card className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="extNumber">Extension Number</Label>
                  <Input
                    id="extNumber"
                    value={editingExtension.number}
                    onChange={(e) => setEditingExtension({
                      ...editingExtension,
                      number: e.target.value
                    })}
                    placeholder="1001"
                  />
                </div>
                
                <div>
                  <Label htmlFor="extName">Display Name</Label>
                  <Input
                    id="extName"
                    value={editingExtension.name}
                    onChange={(e) => setEditingExtension({
                      ...editingExtension,
                      name: e.target.value
                    })}
                    placeholder="Security Desk"
                  />
                </div>
                
                <div>
                  <Label htmlFor="extSecret">Secret (Password)</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="extSecret"
                      value={editingExtension.secret}
                      onChange={(e) => setEditingExtension({
                        ...editingExtension,
                        secret: e.target.value
                      })}
                      type={showSecrets[editingExtension.id] ? "text" : "password"}
                    />
                    <Button
                      variant="outline"
                      onClick={() => setEditingExtension({
                        ...editingExtension,
                        secret: generateSecret()
                      })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={saveExtension}
                    disabled={!editingExtension.number || !editingExtension.name}
                    className="flex-1 jericho-btn-primary"
                  >
                    Save Extension
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => setEditingExtension(null)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Extension Selected</p>
              <p className="text-sm mt-1">Select an extension to edit or add a new one</p>
            </Card>
          )}
        </div>
      </div>

      {/* Softphone Setup Instructions */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Softphone Setup Instructions</h5>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <p>1. Download a SIP softphone app (Zoiper, 3CX Phone, etc.)</p>
          <p>2. Copy extension configuration using the button above</p>
          <p>3. Enter the server details in your softphone</p>
          <p>4. The extension should register automatically</p>
          <p>5. Test by calling another extension or external number</p>
        </div>
      </Card>
    </div>
  );
};
