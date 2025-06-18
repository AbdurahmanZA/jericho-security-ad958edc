
import { useState, useRef, useEffect, useCallback } from 'react';
import { config } from '@/config/environment';

interface WebSocketHookProps {
  onLog?: (msg: string) => void;
  onMessage: (data: any) => void;
}

export const useWebSocketManager = ({ onLog, onMessage }: WebSocketHookProps) => {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const connectionRetryCount = useRef(0);
  const lastConnectionAttempt = useRef(0);

  const MAX_CONNECTION_RETRIES = 5;
  const CONNECTION_RETRY_DELAY = 5000;

  const connectWebSocket = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastConnectionAttempt.current;
    
    // Rate limiting: don't attempt connection too frequently
    if (timeSinceLastAttempt < CONNECTION_RETRY_DELAY && connectionRetryCount.current > 0) {
      onLog?.(`Rate limiting WebSocket connection attempt. Wait ${Math.ceil((CONNECTION_RETRY_DELAY - timeSinceLastAttempt) / 1000)}s`);
      return;
    }

    if (connectionRetryCount.current >= MAX_CONNECTION_RETRIES) {
      onLog?.(`Max WebSocket connection attempts reached (${MAX_CONNECTION_RETRIES}). Please check backend service.`);
      setConnectionState('failed');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('connecting');
    lastConnectionAttempt.current = now;
    connectionRetryCount.current++;

    const wsUrl = config.backend.wsUrl;
    onLog?.(`Attempting WebSocket connection ${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES} to ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          onLog?.(`WebSocket connection timeout after 10s`);
          setConnectionState('failed');
          scheduleReconnection();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket connected successfully to ${wsUrl}`);
        setConnectionState('connected');
        connectionRetryCount.current = 0; // Reset retry count on successful connection
        wsRef.current = ws;
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        setConnectionState('disconnected');
        wsRef.current = null;
        
        // Only attempt reconnection if not manually closed
        if (event.code !== 1000 && connectionRetryCount.current < MAX_CONNECTION_RETRIES) {
          scheduleReconnection();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        onLog?.(`WebSocket error: ${error.type} - backend server may not be running`);
        setConnectionState('failed');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          // Ignore JSON parse errors for non-JSON messages
        }
      };

    } catch (error: any) {
      onLog?.(`WebSocket connection failed: ${error.message}`);
      setConnectionState('failed');
      scheduleReconnection();
    }
  }, [onLog, onMessage]);

  const scheduleReconnection = useCallback(() => {
    if (connectionRetryCount.current < MAX_CONNECTION_RETRIES) {
      const delay = CONNECTION_RETRY_DELAY * Math.pow(2, connectionRetryCount.current - 1); // Exponential backoff
      onLog?.(`Scheduling WebSocket reconnection in ${delay / 1000}s (attempt ${connectionRetryCount.current + 1}/${MAX_CONNECTION_RETRIES})`);
      
      setTimeout(() => {
        if (connectionState !== 'connected') {
          connectWebSocket();
        }
      }, delay);
    }
  }, [connectionState, connectWebSocket, onLog]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const resetConnection = useCallback(() => {
    connectionRetryCount.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  return {
    connectionState,
    connectionRetryCount: connectionRetryCount.current,
    maxConnectionRetries: MAX_CONNECTION_RETRIES,
    sendMessage,
    resetConnection
  };
};
