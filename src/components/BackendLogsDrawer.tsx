
import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Video, Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logs: string[];
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
}

const BackendLogsDrawer: React.FC<Props> = ({
  open, onOpenChange, logs, onCopy, onDownload, onClear,
}) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>
          <Video className="inline w-5 h-5 mr-2" />
          Backend Server Logs ({logs.length})
        </DrawerTitle>
        <DrawerDescription>
          System events and service messages from the backend server (mock/sample data—replace with live backend integration).
        </DrawerDescription>
        <div className="flex items-center space-x-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={logs.length === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Backend Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={logs.length === 0}
          >
            <svg className="w-4 h-4 mr-2" stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4m8 9H8a2 2 0 0 1-2-2V17m12 2V17a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"></path>
            </svg>
            Download Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
        </div>
      </DrawerHeader>
      <div className="max-h-96 overflow-y-auto px-4 pb-4">
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No backend logs yet</p>
            <p className="text-xs mt-1">Backend server/system events will appear here.</p>
          </div>
        ) : (
          <pre className="text-xs font-mono bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap break-words select-all cursor-text min-h-64">
            {logs.join('\n')}
          </pre>
        )}
      </div>
    </DrawerContent>
  </Drawer>
);

export default BackendLogsDrawer;
