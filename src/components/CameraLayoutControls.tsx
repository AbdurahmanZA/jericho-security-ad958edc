
import React from "react";
import { Button } from "@/components/ui/button";
import { Monitor } from 'lucide-react';

interface Props {
  layout: number;
  isFullscreen: boolean;
  onLayoutChange: (num: number) => void;
  onToggleFullscreen: () => void;
}

const CameraLayoutControls: React.FC<Props> = ({
  layout,
  isFullscreen,
  onLayoutChange,
  onToggleFullscreen,
}) => (
  <div className="mb-6">
    <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
      Camera Layout
    </h3>
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 4, 6, 9, 12].map((num) => (
        <Button
          key={num}
          variant={layout === num ? "default" : "outline"}
          size="sm"
          onClick={() => onLayoutChange(num)}
          className={`text-xs font-semibold ${
            layout === num
              ? 'jericho-btn-accent text-jericho-primary'
              : 'jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary'
          }`}
        >
          {num}
        </Button>
      ))}
    </div>
    <Button
      variant={isFullscreen ? "default" : "outline"}
      size="sm"
      onClick={onToggleFullscreen}
      className={`w-full mt-3 text-xs font-semibold ${
        isFullscreen
          ? 'jericho-btn-accent text-jericho-primary'
          : 'jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary'
      }`}
    >
      <Monitor className="w-3 h-3 mr-2" />
      4×3 VIEW
    </Button>
  </div>
);

export default CameraLayoutControls;
