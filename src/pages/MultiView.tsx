
import React from 'react';
import { CameraGrid } from '@/components/CameraGrid';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from "@/components/ui/toaster";
import { useSearchParams } from 'react-router-dom';

const MultiView = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '2', 10);

  const captureSnapshot = async (cameraId: number) => {
    try {
      const response = await fetch(`/api/snapshot/${cameraId}`, { method: 'POST' });
      if (response.ok) {
        toast({
          title: "Snapshot Captured",
          description: `Camera ${cameraId} image saved`,
        });
      } else {
        throw new Error('Failed to capture snapshot');
      }
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        toast({
            title: "Snapshot Failed",
            description: message,
            variant: "destructive",
        });
    }
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen h-screen bg-background text-foreground p-1 flex flex-col">
        <header className="flex-shrink-0 text-white text-center py-1 text-base font-semibold">
          Multi-View - Page {page} (Cameras {(page - 1) * 12 + 1} - {page * 12})
        </header>
        <main className="flex-grow">
          <CameraGrid
            layout={12}
            isFullscreen={true}
            onSnapshot={captureSnapshot}
            currentPage={page}
          />
        </main>
      </div>
    </>
  );
};

export default MultiView;
