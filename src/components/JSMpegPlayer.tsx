
import React, { useRef, useEffect, useCallback } from 'react';

interface JSMpegPlayerProps {
  cameraId: number;
  wsUrl: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const JSMpegPlayer: React.FC<JSMpegPlayerProps> = ({
  cameraId,
  wsUrl,
  onConnected,
  onDisconnected,
  onError,
  className = "w-full h-full"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying JSMpeg player:', error);
      }
      playerRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const initializePlayer = useCallback(() => {
    if (!canvasRef.current) return;

    cleanup();

    try {
      // Check if JSMpeg is available globally
      if (typeof window !== 'undefined' && window.JSMpeg) {
        const JSMpeg = window.JSMpeg;
        
        playerRef.current = new JSMpeg.Player(wsUrl, {
          canvas: canvasRef.current,
          autoplay: true,
          audio: false,
          loop: false,
          disableGl: false,
          preserveDrawingBuffer: false,
          progressive: true,
          throttled: false,
          chunkSize: 1024 * 1024,
          onSourceEstablished: () => {
            console.log(`JSMpeg player connected for Camera ${cameraId}`);
            onConnected?.();
          },
          onSourceCompleted: () => {
            console.log(`JSMpeg stream ended for Camera ${cameraId}`);
            onDisconnected?.();
          },
          onSourceError: (error: any) => {
            console.error(`JSMpeg error for Camera ${cameraId}:`, error);
            onError?.(`JSMpeg stream error: ${error.message || 'Unknown error'}`);
          }
        });
      } else {
        // Fallback: Manual WebSocket handling
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`WebSocket connected for Camera ${cameraId}`);
          onConnected?.();
        };

        ws.onclose = () => {
          console.log(`WebSocket disconnected for Camera ${cameraId}`);
          onDisconnected?.();
        };

        ws.onerror = (error) => {
          console.error(`WebSocket error for Camera ${cameraId}:`, error);
          onError?.('WebSocket connection failed');
        };

        ws.onmessage = (event) => {
          // Handle binary MPEG data here if needed
          // This would require manual MPEG decoding implementation
        };
      }
    } catch (error: any) {
      console.error(`Failed to initialize JSMpeg player for Camera ${cameraId}:`, error);
      onError?.(`Player initialization failed: ${error.message}`);
    }
  }, [cameraId, wsUrl, onConnected, onDisconnected, onError, cleanup]);

  useEffect(() => {
    // Load JSMpeg library if not already loaded
    if (typeof window !== 'undefined' && !window.JSMpeg) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsmpeg@0.2.1/jsmpeg.min.js';
      script.onload = initializePlayer;
      script.onerror = () => {
        console.error('Failed to load JSMpeg library');
        onError?.('Failed to load JSMpeg library');
      };
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
      };
    } else {
      initializePlayer();
    }

    return cleanup;
  }, [initializePlayer, cleanup]);

  return (
    <div className="relative w-full h-full bg-black">
      <canvas
        ref={canvasRef}
        className={className}
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
      
      {/* Stream indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className="text-green-400">JSMpeg Live</span>
      </div>
    </div>
  );
};
