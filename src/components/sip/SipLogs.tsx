
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, PhoneCall, PhoneOff, AlertTriangle, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react';

interface SipLogEntry {
  id: string;
  timestamp: string;
  type: 'registration' | 'call' | 'error' | 'system';
  level: 'info' | 'warning' | 'error' | 'success';
  extension?: string;
  message: string;
  details?: string;
}

export const SipLogs: React.FC = () => {
  const [logs, setLogs] = useState<SipLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    generateMockLogs();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        addRandomLog();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const generateMockLogs = () => {
    const mockLogs: SipLogEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'system',
        level: 'info',
        message: 'Asterisk server started',
        details: 'PBX system initialized with G729 codec support'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        type: 'registration',
        level: 'success',
        extension: '1001',
        message: 'Extension 1001 registered',
        details: 'IP: 192.168.1.105, User-Agent: Zoiper 5'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 180000).toISOString(),
        type: 'registration',
        level: 'success',
        extension: '1002',
        message: 'Extension 1002 registered',
        details: 'IP: 192.168.1.110, User-Agent: 3CX Phone'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'call',
        level: 'info',
        extension: '1001',
        message: 'Outgoing call to 0111234567',
        details: 'Duration: 45 seconds, Codec: G729'
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'error',
        level: 'error',
        extension: '1003',
        message: 'Registration failed for extension 1003',
        details: 'Authentication failed - invalid credentials'
      },
      {
        id: '6',
        timestamp: new Date().toISOString(),
        type: 'call',
        level: 'warning',
        extension: '1002',
        message: 'Call to emergency number 10111',
        details: 'Emergency services contacted from Security Desk'
      }
    ];
    setLogs(mockLogs);
  };

  const addRandomLog = () => {
    const types: Array<SipLogEntry['type']> = ['registration', 'call', 'error', 'system'];
    const levels: Array<SipLogEntry['level']> = ['info', 'warning', 'error', 'success'];
    const extensions = ['1001', '1002', '1003'];
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    const randomExt = extensions[Math.floor(Math.random() * extensions.length)];

    const messages = {
      registration: [
        `Extension ${randomExt} registered successfully`,
        `Extension ${randomExt} unregistered`,
        `Registration timeout for extension ${randomExt}`
      ],
      call: [
        `Incoming call from ${randomExt}`,
        `Outgoing call to 082${Math.floor(Math.random() * 9000000 + 1000000)}`,
        `Call ended - Duration: ${Math.floor(Math.random() * 300)} seconds`
      ],
      error: [
        `Authentication failed for extension ${randomExt}`,
        `Network timeout`,
        `Codec negotiation failed`
      ],
      system: [
        'SIP registrar reloaded',
        'G729 codec license verified',
        'RTP port pool refreshed'
      ]
    };

    const randomMessage = messages[randomType][Math.floor(Math.random() * messages[randomType].length)];

    const newLog: SipLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: randomType,
      level: randomLevel,
      extension: randomType !== 'system' ? randomExt : undefined,
      message: randomMessage,
      details: `Generated at ${new Date().toLocaleTimeString()}`
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.type}: ${log.message}${log.details ? ` - ${log.details}` : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jericho-sip-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredLogs = () => {
    if (filter === 'all') return logs;
    return logs.filter(log => log.type === filter);
  };

  const getLogIcon = (type: SipLogEntry['type']) => {
    switch (type) {
      case 'registration':
        return <Phone className="w-4 h-4" />;
      case 'call':
        return <PhoneCall className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'system':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: SipLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold uppercase tracking-wide">SIP System Logs</h4>
        <div className="flex items-center space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="registration">Registration</SelectItem>
              <SelectItem value="call">Calls</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.type === 'registration' && l.level === 'success').length}
          </div>
          <div className="text-sm text-muted-foreground">Active Registrations</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.type === 'call').length}
          </div>
          <div className="text-sm text-muted-foreground">Total Calls</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.level === 'error').length}
          </div>
          <div className="text-sm text-muted-foreground">Errors</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {logs.filter(l => l.level === 'warning').length}
          </div>
          <div className="text-sm text-muted-foreground">Warnings</div>
        </Card>
      </div>

      {/* Log Display */}
      <Card className="p-4">
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {getFilteredLogs().length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No logs available</p>
                <p className="text-sm mt-1">Logs will appear here as the system operates</p>
              </div>
            ) : (
              getFilteredLogs().map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted">
                  <div className={`mt-0.5 ${getLevelColor(log.level)}`}>
                    {getLogIcon(log.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{log.message}</span>
                      {log.extension && (
                        <Badge variant="outline" className="text-xs">
                          Ext {log.extension}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${getLevelColor(log.level)}`}>
                        {log.level}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span className="capitalize">{log.type}</span>
                    </div>
                    
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};
