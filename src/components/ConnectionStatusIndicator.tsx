
import React from 'react';
import { Button } from '@/components/ui/button';

interface ConnectionStatusIndicatorProps {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  connectionRetryCount: number;
  maxConnectionRetries: number;
  onReconnect: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  connectionState,
  connectionRetryCount,
  maxConnectionRetries,
  onReconnect
}) => {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-xs text-gray-400">
          Backend: {connectionState} 
          {connectionRetryCount > 0 && ` (${connectionRetryCount}/${maxConnectionRetries})`}
        </span>
      </div>
      {connectionState === 'failed' && connectionRetryCount >= maxConnectionRetries && (
        <Button
          onClick={onReconnect}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Reconnect
        </Button>
      )}
    </div>
  );
};
