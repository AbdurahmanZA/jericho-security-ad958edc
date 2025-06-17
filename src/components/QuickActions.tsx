
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Image, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { SnapshotGallery } from "./SnapshotGallery";
import { SimpleHikvisionSetup } from "./SimpleHikvisionSetup";

interface Props {
  onShowSnapshots?: () => void;
  onShowHikvisionSetup?: () => void;
  onShowSettings?: () => void;
}

const QuickActions: React.FC<Props> = ({
  onShowSnapshots,
  onShowHikvisionSetup,
  onShowSettings,
}) => {
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHikvisionSetup, setShowHikvisionSetup] = useState(false);

  const handleShowSnapshots = () => {
    if (onShowSnapshots) {
      onShowSnapshots();
    } else {
      setShowSnapshots(true);
    }
  };

  const handleShowHikvisionSetup = () => {
    if (onShowHikvisionSetup) {
      onShowHikvisionSetup();
    } else {
      setShowHikvisionSetup(true);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowSnapshots}
            className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
          >
            <Image className="w-3 h-3 mr-2" />
            VIEW SNAPSHOTS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowHikvisionSetup}
            className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
          >
            <Settings className="w-3 h-3 mr-2" />
            HIKVISION SETUP
          </Button>
          <Link to="/settings">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
            >
              <Settings className="w-3 h-3 mr-2" />
              SYSTEM SETTINGS
            </Button>
          </Link>
        </div>
      </div>

      <SnapshotGallery 
        open={showSnapshots} 
        onClose={() => setShowSnapshots(false)} 
      />
      
      <SimpleHikvisionSetup 
        open={showHikvisionSetup} 
        onClose={() => setShowHikvisionSetup(false)} 
      />
    </>
  );
};

export default QuickActions;
