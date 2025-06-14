
import React from 'react';
import { Bell, AlertTriangle, Info, Shield } from 'lucide-react';

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
        return 'text-red-300 bg-red-900/30 border-red-600/50';
      case 'medium':
        return 'text-yellow-300 bg-yellow-900/30 border-yellow-600/50';
      case 'low':
        return 'text-blue-300 bg-blue-900/30 border-blue-600/50';
      default:
        return 'text-gray-300 bg-gray-900/30 border-gray-600/50';
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
      <h3 className="text-sm font-bold text-jericho-very-light flex items-center uppercase tracking-wider">
        <Shield className="w-4 h-4 mr-2 text-jericho-accent" />
        Motion Log
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center text-jericho-light text-xs py-6 bg-jericho-dark-teal/30 rounded-lg border border-jericho-light/20">
            <Shield className="w-8 h-8 mx-auto mb-2 text-jericho-light opacity-50" />
            <p className="font-semibold uppercase tracking-wide">No Motion Events</p>
            <p className="text-xs mt-1 opacity-75">System monitoring active</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded-lg text-xs border ${getSeverityColor(event.severity)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(event.severity)}
                  <span className="font-bold text-white uppercase tracking-wider">
                    CAM {event.camera}
                  </span>
                </div>
                <span className="text-jericho-light font-mono text-xs">
                  {formatTime(event.timestamp)}
                </span>
              </div>
              
              <div className="text-xs text-jericho-very-light mb-2 font-medium">
                {event.description}
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs opacity-90 capitalize font-semibold text-jericho-light">
                  {event.type}
                </span>
                <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide ${
                  event.source === 'hikvision' 
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-600/30' 
                    : 'bg-green-900/40 text-green-300 border border-green-600/30'
                }`}>
                  {event.source}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {events.length > 0 && (
        <div className="text-center pt-2">
          <button 
            onClick={() => window.location.reload()}
            className="text-xs text-jericho-accent hover:text-jericho-accent/80 font-semibold uppercase tracking-wide transition-colors"
          >
            Clear Log
          </button>
        </div>
      )}
    </div>
  );
};
