import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'warning';
}

export const BackendLogsDrawer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const addLog = (message: string, type: 'info' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    addLog('Attempting WebSocket connection to backend server');
    
    // Fixed: Use ws:// instead of wss:// for HTTP setup
    const wsUrl = `ws://192.168.0.138/api/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      addLog('Connected to backend monitoring server');
    };

    ws.onclose = () => {
      setIsConnected(false);
      addLog('Backend monitoring disconnected', 'warning');
      
      // Retry connection after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
      addLog(`WebSocket connection failed to ${wsUrl}`, 'error');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          addLog(`Backend: ${data.message}`, data.level || 'info');
        }
      } catch {
        addLog(`Backend: ${event.data}`);
      }
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    if (isOpen) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen]);

  const clearLogs = () => {
    setLogs([]);
    toast({
      title: "Logs Cleared",
      description: "Backend logs have been cleared",
    });
  };

  const downloadLogs = () => {
    const logsText = logs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backend-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="bg-gray-800 text-white border-gray-600">
          <Terminal className="w-4 h-4 mr-2" />
          Backend Logs
          {isConnected && <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[600px] bg-gray-900 text-white border-gray-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center justify-between">
            <span>Backend Monitoring</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex justify-between items-center py-4">
          <div className="text-sm text-gray-400">
            {logs.length} log entries
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={logs.length === 0}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="bg-red-600 text-white border-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] bg-black/50 rounded-lg p-4">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Waiting for backend activity...
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={`ml-2 ${getLogTypeColor(log.type)}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
