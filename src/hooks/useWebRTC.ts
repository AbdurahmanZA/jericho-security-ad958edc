
import { useRef, useEffect, useState } from 'react';

export interface WebRTCPlayer {
  setupWebRTCPlayer: (cameraId: number, videoElement: HTMLVideoElement, onLog?: (msg: string) => void) => Promise<boolean>;
  cleanupWebRTCPlayer: (cameraId: number, onLog?: (msg: string) => void) => void;
  webrtcConnectionsRef: React.MutableRefObject<Record<number, RTCPeerConnection>>;
}

export const useWebRTC = (): WebRTCPlayer => {
  const webrtcConnectionsRef = useRef<Record<number, RTCPeerConnection>>({});
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to go2rtc WebRTC signaling
    const connectWebRTCSignaling = () => {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/ws`;

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebRTC signaling connected');
        setWsConnection(ws);
      };

      ws.onclose = () => {
        console.log('WebRTC signaling disconnected');
        setWsConnection(null);
        // Reconnect after 5 seconds
        setTimeout(connectWebRTCSignaling, 5000);
      };

      ws.onerror = () => {
        console.log('WebRTC signaling error');
      };
    };

    connectWebRTCSignaling();

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const setupWebRTCPlayer = async (
    cameraId: number,
    videoElement: HTMLVideoElement,
    onLog?: (msg: string) => void
  ): Promise<boolean> => {
    if (!videoElement || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      onLog?.(`WebRTC setup failed for Camera ${cameraId}: No signaling connection`);
      return false;
    }

    try {
      // Clean up any existing connection
      if (webrtcConnectionsRef.current[cameraId]) {
        webrtcConnectionsRef.current[cameraId].close();
        delete webrtcConnectionsRef.current[cameraId];
      }

      onLog?.(`Setting up WebRTC for Camera ${cameraId}`);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      webrtcConnectionsRef.current[cameraId] = pc;

      // Handle incoming stream
      pc.ontrack = (event) => {
        onLog?.(`WebRTC stream received for Camera ${cameraId}`);
        videoElement.srcObject = event.streams[0];
        videoElement.play().catch(error => {
          onLog?.(`WebRTC autoplay failed for Camera ${cameraId}: ${error.message}`);
        });
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        onLog?.(`WebRTC connection state for Camera ${cameraId}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          cleanupWebRTCPlayer(cameraId, onLog);
        }
      };

      // Add transceiver for receiving video
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via WebSocket to go2rtc
      const message = {
        type: 'webrtc',
        value: offer.sdp
      };

      wsConnection.send(JSON.stringify(message));

      // Wait for answer (this would need proper WebSocket message handling)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          onLog?.(`WebRTC setup timeout for Camera ${cameraId}`);
          resolve(false);
        }, 10000);

        const handleMessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'webrtc' && data.value) {
              pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: data.value
              })).then(() => {
                clearTimeout(timeout);
                wsConnection.removeEventListener('message', handleMessage);
                onLog?.(`WebRTC connected successfully for Camera ${cameraId}`);
                resolve(true);
              }).catch(() => {
                clearTimeout(timeout);
                wsConnection.removeEventListener('message', handleMessage);
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
      onLog?.(`WebRTC setup error for Camera ${cameraId}: ${error.message}`);
      return false;
    }
  };

  const cleanupWebRTCPlayer = (cameraId: number, onLog?: (msg: string) => void) => {
    if (webrtcConnectionsRef.current[cameraId]) {
      onLog?.(`Cleaning up WebRTC for Camera ${cameraId}`);
      webrtcConnectionsRef.current[cameraId].close();
      delete webrtcConnectionsRef.current[cameraId];
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup all connections on unmount
      Object.keys(webrtcConnectionsRef.current).forEach(id => {
        webrtcConnectionsRef.current[Number(id)]?.close();
      });
    };
  }, []);

  return { setupWebRTCPlayer, cleanupWebRTCPlayer, webrtcConnectionsRef };
};
