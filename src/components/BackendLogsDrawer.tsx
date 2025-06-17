
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2, Download, Copy } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: string[];
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

export const BackendLogsDrawer: React.FC<Props> = ({
  open,
  onOpenChange,
  logs,
  onCopy,
  onDownload,
  onClear
}) => {
  const getLogTypeColor = (logEntry: string) => {
    if (logEntry.includes('error') || logEntry.includes('failed')) return 'text-red-400';
    if (logEntry.includes('warning') || logEntry.includes('disconnected')) return 'text-yellow-400';
    return 'text-gray-300';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] bg-gray-900 text-white border-gray-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center justify-between">
            <span className="flex items-center">
              <Terminal className="w-5 h-5 mr-2" />
              Backend Logs ({logs.length})
            </span>
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
              onClick={onCopy}
              disabled={logs.length === 0}
              className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={logs.length === 0}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
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
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No backend logs yet</p>
                <p className="text-xs mt-1">Backend server events and WebSocket activity will appear here.</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="font-mono text-sm">
                  <span className={getLogTypeColor(log)}>
                    {log}
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
