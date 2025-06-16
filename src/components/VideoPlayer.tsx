
import React, { useRef, useEffect, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useCameraHLS } from '@/hooks/useCameraHLS';

interface VideoPlayerProps {
  cameraId: number;
  isActive: boolean;
  onLog?: (msg: string) => void;
  updateCameraState?: (id: number, updates: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  cameraId,
  isActive,
  onLog,
  updateCameraState
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamType, setStreamType] = useState<'webrtc' | 'hls' | 'none'>('none');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { setupWebRTCPlayer, cleanupWebRTCPlayer } = useWebRTC();
  const { setupHLSPlayer, cleanupHLSPlayer, hlsInstancesRef } = useCameraHLS();

  useEffect(() => {
    if (!isActive || !videoRef.current) {
      // Clean up when not active
      cleanupWebRTCPlayer(cameraId, onLog);
      cleanupHLSPlayer(cameraId, onLog);
      setStreamType('none');
      setIsConnecting(false);
      return;
    }

    const tryConnection = async () => {
      setIsConnecting(true);
      onLog?.(`Attempting connection for Camera ${cameraId}`);

      // Try WebRTC first
      onLog?.(`Trying WebRTC for Camera ${cameraId}`);
      const webrtcSuccess = await setupWebRTCPlayer(cameraId, videoRef.current!, onLog);
      
      if (webrtcSuccess) {
        setStreamType('webrtc');
        setIsConnecting(false);
        onLog?.(`Camera ${cameraId} connected via WebRTC (low latency)`);
        updateCameraState?.(cameraId, { connectionType: 'webrtc', hlsAvailable: false });
        return;
      }

      // Fallback to HLS
      onLog?.(`WebRTC failed for Camera ${cameraId}, falling back to HLS`);
      
      // Small delay before trying HLS
      setTimeout(() => {
        if (videoRef.current && isActive) {
          setupHLSPlayer(cameraId, videoRef.current, onLog, updateCameraState);
          setStreamType('hls');
          setIsConnecting(false);
          onLog?.(`Camera ${cameraId} connected via HLS (standard latency)`);
        }
      }, 1000);
    };

    tryConnection();

  }, [isActive, cameraId, setupWebRTCPlayer, setupHLSPlayer, cleanupWebRTCPlayer, cleanupHLSPlayer, onLog, updateCameraState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWebRTCPlayer(cameraId, onLog);
      cleanupHLSPlayer(cameraId, onLog);
    };
  }, [cameraId, cleanupWebRTCPlayer, cleanupHLSPlayer, onLog]);

  const getStreamIndicator = () => {
    if (isConnecting) return { text: 'Connecting...', color: 'text-yellow-400' };
    switch (streamType) {
      case 'webrtc': return { text: 'Live', color: 'text-green-400' };
      case 'hls': return { text: 'Streaming', color: 'text-blue-400' };
      default: return { text: 'Offline', color: 'text-gray-400' };
    }
  };

  const indicator = getStreamIndicator();

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        autoPlay
        muted
        playsInline
        controls={false}
      >
        Your browser does not support video playback.
      </video>
      
      {/* Stream type indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black bg-opacity-70 rounded text-xs">
        <span className={indicator.color}>{indicator.text}</span>
      </div>
    </div>
  );
};
