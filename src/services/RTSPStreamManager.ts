
export interface StreamConfig {
  cameraId: number;
  rtspUrl: string;
  name?: string;
  type: 'jsmpeg' | 'hls' | 'webrtc';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  priority?: number;
}

export interface StreamStatus {
  cameraId: number;
  isActive: boolean;
  streamType: 'jsmpeg' | 'hls' | 'webrtc' | 'none';
  quality: string;
  latency?: number;
  bandwidth?: number;
  errors: number;
  lastError?: string;
  uptime: number;
  reconnectAttempts: number;
}

export class RTSPStreamManager {
  private streams: Map<number, StreamConfig> = new Map();
  private statuses: Map<number, StreamStatus> = new Map();
  private wsConnections: Map<number, WebSocket> = new Map();
  private reconnectTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private onStatusUpdate?: (status: StreamStatus) => void;
  private onLog?: (message: string) => void;

  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000;
  private readonly STREAM_PRIORITY = ['jsmpeg', 'webrtc', 'hls'] as const;

  constructor(onStatusUpdate?: (status: StreamStatus) => void, onLog?: (message: string) => void) {
    this.onStatusUpdate = onStatusUpdate;
    this.onLog = onLog;
  }

  // Add a stream configuration
  addStream(config: StreamConfig): void {
    this.streams.set(config.cameraId, config);
    this.initializeStreamStatus(config.cameraId);
    this.log(`Stream configured for Camera ${config.cameraId} (${config.type})`);
  }

  // Start streaming with automatic fallback
  async startStream(cameraId: number): Promise<boolean> {
    const config = this.streams.get(cameraId);
    if (!config) {
      this.log(`No configuration found for Camera ${cameraId}`);
      return false;
    }

    // Try streams in priority order
    for (const streamType of this.STREAM_PRIORITY) {
      try {
        const success = await this.attemptStreamStart(cameraId, streamType);
        if (success) {
          this.updateStreamStatus(cameraId, { 
            isActive: true, 
            streamType,
            reconnectAttempts: 0 
          });
          return true;
        }
      } catch (error) {
        this.log(`${streamType} failed for Camera ${cameraId}: ${error.message}`);
      }
    }

    this.updateStreamStatus(cameraId, { 
      isActive: false, 
      streamType: 'none',
      lastError: 'All stream types failed'
    });
    return false;
  }

  // Stop a stream
  stopStream(cameraId: number): void {
    const timeout = this.reconnectTimeouts.get(cameraId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(cameraId);
    }

    const ws = this.wsConnections.get(cameraId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(cameraId);
    }

    this.updateStreamStatus(cameraId, { 
      isActive: false, 
      streamType: 'none',
      reconnectAttempts: 0
    });
    
    this.log(`Stream stopped for Camera ${cameraId}`);
  }

  // Get stream status
  getStreamStatus(cameraId: number): StreamStatus | undefined {
    return this.statuses.get(cameraId);
  }

  // Get all active streams
  getActiveStreams(): StreamStatus[] {
    return Array.from(this.statuses.values()).filter(status => status.isActive);
  }

  private async attemptStreamStart(cameraId: number, streamType: string): Promise<boolean> {
    const config = this.streams.get(cameraId);
    if (!config) return false;

    switch (streamType) {
      case 'jsmpeg':
        return this.startJSMpegStream(cameraId, config);
      case 'webrtc':
        return this.startWebRTCStream(cameraId, config);
      case 'hls':
        return this.startHLSStream(cameraId, config);
      default:
        return false;
    }
  }

  private async startJSMpegStream(cameraId: number, config: StreamConfig): Promise<boolean> {
    try {
      // JSMpeg WebSocket connection
      const wsUrl = `ws://192.168.0.138/jsmpeg/${cameraId}`;
      const ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.wsConnections.set(cameraId, ws);
          this.log(`JSMpeg stream connected for Camera ${cameraId}`);
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };

        ws.onclose = () => {
          this.handleStreamDisconnection(cameraId);
        };
      });
    } catch (error) {
      this.log(`JSMpeg connection failed for Camera ${cameraId}: ${error.message}`);
      return false;
    }
  }

  private async startWebRTCStream(cameraId: number, config: StreamConfig): Promise<boolean> {
    try {
      // Use existing WebRTC implementation
      const response = await fetch(`http://192.168.0.138/api/webrtc/streams/${cameraId}/start`, { 
        method: 'POST' 
      });
      
      if (response.ok) {
        this.log(`WebRTC stream available for Camera ${cameraId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.log(`WebRTC setup failed for Camera ${cameraId}: ${error.message}`);
      return false;
    }
  }

  private async startHLSStream(cameraId: number, config: StreamConfig): Promise<boolean> {
    try {
      // Use existing HLS implementation
      const response = await fetch(`http://192.168.0.138/api/streams/${cameraId}/start`, { 
        method: 'POST' 
      });
      
      if (response.ok) {
        this.log(`HLS stream started for Camera ${cameraId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.log(`HLS stream failed for Camera ${cameraId}: ${error.message}`);
      return false;
    }
  }

  private handleStreamDisconnection(cameraId: number): void {
    const status = this.statuses.get(cameraId);
    if (!status || status.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.log(`Camera ${cameraId} exceeded max reconnection attempts`);
      this.stopStream(cameraId);
      return;
    }

    this.updateStreamStatus(cameraId, { 
      isActive: false,
      reconnectAttempts: status.reconnectAttempts + 1 
    });

    const timeout = setTimeout(() => {
      this.log(`Attempting to reconnect Camera ${cameraId} (attempt ${status.reconnectAttempts + 1})`);
      this.startStream(cameraId);
    }, this.RECONNECT_DELAY * (status.reconnectAttempts + 1));

    this.reconnectTimeouts.set(cameraId, timeout);
  }

  private initializeStreamStatus(cameraId: number): void {
    this.statuses.set(cameraId, {
      cameraId,
      isActive: false,
      streamType: 'none',
      quality: 'medium',
      errors: 0,
      uptime: 0,
      reconnectAttempts: 0
    });
  }

  private updateStreamStatus(cameraId: number, updates: Partial<StreamStatus>): void {
    const current = this.statuses.get(cameraId);
    if (current) {
      const updated = { ...current, ...updates };
      this.statuses.set(cameraId, updated);
      this.onStatusUpdate?.(updated);
    }
  }

  private log(message: string): void {
    this.onLog?.(message);
    console.log(`[RTSPStreamManager] ${message}`);
  }

  // Cleanup all resources
  destroy(): void {
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.wsConnections.forEach(ws => ws.close());
    this.streams.clear();
    this.statuses.clear();
    this.wsConnections.clear();
    this.reconnectTimeouts.clear();
  }
}
