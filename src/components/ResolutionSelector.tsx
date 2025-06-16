
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Monitor } from 'lucide-react';

export type ResolutionProfile = 'low' | 'medium' | 'high';

interface ResolutionSelectorProps {
  currentProfile: ResolutionProfile;
  onProfileChange: (profile: ResolutionProfile) => void;
  disabled?: boolean;
}

const profileLabels = {
  low: 'Low (360p)',
  medium: 'Medium (720p)', 
  high: 'High (1080p)'
};

export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  currentProfile,
  onProfileChange,
  disabled = false
}) => {
  const getProfileColor = (profile: ResolutionProfile) => {
    switch (profile) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-6 w-6 p-0"
          title={`Resolution: ${profileLabels[currentProfile]}`}
        >
          <Monitor className={`w-3 h-3 ${getProfileColor(currentProfile)}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {Object.entries(profileLabels).map(([profile, label]) => (
          <DropdownMenuItem
            key={profile}
            onClick={() => onProfileChange(profile as ResolutionProfile)}
            className={currentProfile === profile ? 'bg-accent' : ''}
          >
            <Monitor className={`w-3 h-3 mr-2 ${getProfileColor(profile as ResolutionProfile)}`} />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
