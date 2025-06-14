
import React from 'react';
import { Bell, AlertTriangle, Info } from 'lucide-react';

interface MotionEvent {
  id: string;
  timestamp: string;
  camera: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
  source: 'hikvision' | 'ffmpeg';
  description: string;
}

interface MotionLogProps {
  events: MotionEvent[];
}

export const MotionLog: React.FC<MotionLogProps> = ({ events }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-900/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'low':
        return 'text-blue-400 bg-blue-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-3 h-3" />;
      case 'medium':
        return <Bell className="w-3 h-3" />;
      case 'low':
        return <Info className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center">
        <Bell className="w-4 h-4 mr-2" />
        Motion Log
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-4">
            No motion events detected
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`p-2 rounded-lg text-xs ${getSeverityColor(event.severity)} border border-gray-700`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1">
                  {getSeverityIcon(event.severity)}
                  <span className="font-medium">Cam {event.camera}</span>
                </div>
                <span className="text-gray-400">{formatTime(event.timestamp)}</span>
              </div>
              
              <div className="text-xs text-gray-300 mb-1">
                {event.description}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-75 capitalize">
                  {event.type}
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  event.source === 'hikvision' 
                    ? 'bg-purple-900/30 text-purple-300' 
                    : 'bg-green-900/30 text-green-300'
                }`}>
                  {event.source}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {events.length > 0 && (
        <div className="text-center">
          <button 
            onClick={() => window.location.reload()}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Clear Log
          </button>
        </div>
      )}
    </div>
  );
};
