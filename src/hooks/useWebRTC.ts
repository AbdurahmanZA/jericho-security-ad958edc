
import { useRef, useEffect, useState, useCallback } from 'react';

export interface WebRTCPlayer {
  setupWebRTCPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void) => Promise<boolean>;
  cleanupWebRTCPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  webrtcConnectionsRef: React.MutableRefObject<Record<number, RTCPeerConnection>>;
}

export const useWebRTC = (): WebRTCPlayer => {
  const webrtcConnectionsRef = useRef<Record<number, RTCPeerConnection>>({});
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pendingSetupsRef = useRef<Set<number>>(new Set());

  const connectWebRTCSignaling = useCallback(() => {
    const wsUrl = `wss://192.168.0.138/api/ws`;

    console.log('Connecting to WebRTC signaling server:', wsUrl);

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebRTC signaling connected');
      setWsConnection(ws);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    ws.onclose = () => {
      console.log('WebRTC signaling disconnected');
      setWsConnection(null);
      reconnectTimeoutRef.current = setTimeout(connectWebRTCSignaling, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebRTC signaling error:', error);
    };

    return ws;
  }, []);

  useEffect(() => {
    const ws = connectWebRTCSignaling();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebRTCSignaling]);

  const cleanupWebRTCPlayer = useCallback((cameraId: number, onLog?: (msg: string) => void) => {
    // Remove from pending setups
    pendingSetupsRef.current.delete(cameraId);
    
    if (webrtcConnectionsRef.current[cameraId]) {
      onLog?.(`Cleaning up WebRTC connection for Camera ${cameraId}`);
      try {
        webrtcConnectionsRef.current[cameraId].close();
      } catch (error) {
        console.warn(`Error closing WebRTC connection for camera ${cameraId}:`, error);
      }
      delete webrtcConnectionsRef.current[cameraId];
    }
  }, []);

  const setupWebRTCPlayer = useCallback(async (
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void
  ): Promise<boolean> => {
    if (!videoElement || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      onLog?.(`WebRTC setup failed for Camera ${cameraId}: No signaling connection`);
      return false;
    }

    // Prevent multiple simultaneous setups for the same camera
    if (pendingSetupsRef.current.has(cameraId)) {
      onLog?.(`WebRTC setup already in progress for Camera ${cameraId}`);
      return false;
    }

    try {
      pendingSetupsRef.current.add(cameraId);
      
      // Clean up any existing connection first
      cleanupWebRTCPlayer(cameraId, onLog);

      onLog?.(`Setting up WebRTC for Camera ${cameraId}`);

      const response = await fetch(`https://192.168.0.138/api/webrtc/streams/${cameraId}/start`, { method: 'POST' });
      if (!response.ok) {
        onLog?.(`WebRTC stream not available for Camera ${cameraId}`);
        return false;
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      webrtcConnectionsRef.current[cameraId] = pc;

      pc.ontrack = (event) => {
        onLog?.(`WebRTC stream received for Camera ${cameraId}`);
        if (event.streams && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
          videoElement.play().catch(error => {
            onLog?.(`WebRTC autoplay failed for Camera ${cameraId}: ${error.message}`);
          });
        }
      };

      pc.onconnectionstatechange = () => {
        onLog?.(`WebRTC connection state for Camera ${cameraId}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          cleanupWebRTCPlayer(cameraId, onLog);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'ice-candidate',
            cameraId: cameraId,
            candidate: event.candidate
          }));
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const message = {
        type: 'offer',
        cameraId: cameraId,
        sdp: offer.sdp
      };

      wsConnection.send(JSON.stringify(message));

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          onLog?.(`WebRTC setup timeout for Camera ${cameraId}`);
          cleanupWebRTCPlayer(cameraId, onLog);
          resolve(false);
        }, 10000);

        const handleMessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'answer' && data.cameraId === cameraId) {
              pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: data.sdp
              })).then(() => {
                clearTimeout(timeout);
                wsConnection.removeEventListener('message', handleMessage);
                pendingSetupsRef.current.delete(cameraId);
                onLog?.(`WebRTC connected successfully for Camera ${cameraId}`);
                resolve(true);
              }).catch((error) => {
                clearTimeout(timeout);
                wsConnection.removeEventListener('message', handleMessage);
                pendingSetupsRef.current.delete(cameraId);
                onLog?.(`WebRTC answer failed for Camera ${cameraId}: ${error}`);
                resolve(false);
              });
            }
          } catch (error) {
            // Ignore parse errors
          }
        };

        wsConnection.addEventListener('message', handleMessage);
      });

    } catch (error) {
      pendingSetupsRef.current.delete(cameraId);
      onLog?.(`WebRTC setup error for Camera ${cameraId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [wsConnection, cleanupWebRTCPlayer]);

  useEffect(() => {
    return () => {
      Object.keys(webrtcConnectionsRef.current).forEach(id => {
        webrtcConnectionsRef.current[Number(id)]?.close();
      });
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { setupWebRTCPlayer, cleanupWebRTCPlayer, webrtcConnectionsRef };
};
