
import React from 'react';
import { Camera } from 'lucide-react';

export const EmptyCameraGrid: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-800/30">
      <div className="text-center space-y-4">
        <Camera className="w-16 h-16 mx-auto text-gray-500" />
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Welcome to Jericho Security</h3>
          <p className="text-gray-400 mb-4">Your camera display is ready. Add cameras to get started.</p>
        </div>
      </div>
    </div>
  );
};
