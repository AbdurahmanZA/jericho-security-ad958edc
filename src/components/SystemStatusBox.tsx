
import React from "react";

interface SystemStatus {
  uptime: string;
  activeStreams: number;
  totalEvents: number;
  hikvisionConnections: number;
}
interface Props {
  systemStatus: SystemStatus;
}

const SystemStatusBox: React.FC<Props> = ({ systemStatus }) => (
  <div className="mb-6 p-4 jericho-secondary-bg rounded-lg border border-jericho-light/20">
    <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider">
      System Status
    </h3>
    <div className="space-y-2 text-xs">
      <div className="flex justify-between items-center">
        <span className="text-jericho-light">Uptime:</span>
        <span className="text-green-400 font-semibold">{systemStatus.uptime}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-jericho-light">Active Streams:</span>
        <span className="text-blue-400 font-semibold">{systemStatus.activeStreams}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-jericho-light">Motion Events:</span>
        <span className="text-jericho-accent font-semibold">{systemStatus.totalEvents}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-jericho-light">Hikvision:</span>
        <span className="text-purple-400 font-semibold">{systemStatus.hikvisionConnections}</span>
      </div>
    </div>
  </div>
);

export default SystemStatusBox;
