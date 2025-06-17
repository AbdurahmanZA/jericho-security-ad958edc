
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface SimpleHikvisionSetupProps {
  open: boolean;
  onClose: () => void;
}

export const SimpleHikvisionSetup: React.FC<SimpleHikvisionSetupProps> = ({
  open,
  onClose
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Hikvision Camera Setup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>HLS Streaming Mode:</strong> Use the "Add Cameras" button to configure Hikvision cameras 
              with RTSP URLs for HLS conversion.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-semibold">Hikvision RTSP URL Format:</h4>
            <div className="space-y-2 text-sm font-mono bg-gray-800 p-3 rounded">
              <div>Main Stream: <code>rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101</code></div>
              <div>Sub Stream: <code>rtsp://admin:password@192.168.1.100:554/Streaming/Channels/102</code></div>
            </div>
            
            <div className="text-sm text-gray-400">
              <p>• Replace <code>admin:password</code> with your camera credentials</p>
              <p>• Replace <code>192.168.1.100</code> with your camera IP</p>
              <p>• Use channel 101 for main stream, 102 for sub stream</p>
              <p>• HLS conversion adds ~5s latency but supports multiple cameras efficiently</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
