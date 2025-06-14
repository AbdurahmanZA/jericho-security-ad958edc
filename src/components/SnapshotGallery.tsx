
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Snapshot {
  id: string;
  camera: number;
  filename: string;
  timestamp: string;
  path: string;
}

interface SnapshotGalleryProps {
  open: boolean;
  onClose: () => void;
}

export const SnapshotGallery: React.FC<SnapshotGalleryProps> = ({ open, onClose }) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const { toast } = useToast();

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/snapshots');
      if (response.ok) {
        const data = await response.json();
        setSnapshots(data.snapshots || []);
      } else {
        throw new Error('Failed to load snapshots');
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
      toast({
        title: "Error",
        description: "Failed to load snapshots",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSnapshots();
    }
  }, [open]);

  const deleteSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
        setSelectedSnapshot(null);
        toast({
          title: "Snapshot Deleted",
          description: "Snapshot removed successfully",
        });
      } else {
        throw new Error('Failed to delete snapshot');
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadSnapshot = (snapshot: Snapshot) => {
    const link = document.createElement('a');
    link.href = `/api/snapshots/${snapshot.id}/download`;
    link.download = snapshot.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Snapshot Gallery</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSnapshots}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-full">
          {/* Thumbnail Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">No snapshots found</p>
                  <p className="text-sm">Capture some images from the camera grid</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-2">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedSnapshot?.id === snapshot.id
                        ? 'border-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <img
                      src={`/api/snapshots/${snapshot.id}`}
                      alt={`Camera ${snapshot.camera} snapshot`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-1">
                      <div className="text-xs text-white">
                        <div className="font-medium">Cam {snapshot.camera}</div>
                        <div className="text-gray-300">
                          {formatTimestamp(snapshot.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 flex flex-col border-l border-gray-700 pl-4">
            {selectedSnapshot ? (
              <>
                <div className="flex-1 mb-4">
                  <img
                    src={`/api/snapshots/${selectedSnapshot.id}`}
                    alt={`Camera ${selectedSnapshot.camera} snapshot`}
                    className="w-full h-full object-contain rounded-lg bg-gray-800"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-2">Snapshot Details</div>
                    <div className="space-y-1 text-gray-300">
                      <div>Camera: {selectedSnapshot.camera}</div>
                      <div>Captured: {formatTimestamp(selectedSnapshot.timestamp)}</div>
                      <div>Filename: {selectedSnapshot.filename}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSnapshot(selectedSnapshot)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSnapshot(selectedSnapshot.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <p>Select a snapshot to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
