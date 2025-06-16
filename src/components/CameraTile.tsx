
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Play, Square, Image, Edit2, Check, X, AlertTriangle } from "lucide-react";
import { CameraState } from "@/hooks/useCameraState";
import { HLSPlayer } from "@/hooks/useCameraHLS";
import { ResolutionSelector, ResolutionProfile } from "./ResolutionSelector";

interface CameraTileProps {
  cameraId: number;
  url: string;
  name: string;
  isActive: boolean;
  isEditing: boolean;
  isEditingName: boolean;
  cameraState: CameraState;
  tempUrl: string;
  tempName: string;
  setEditingCamera: (id: number | null) => void;
  setEditingName: (id: number | null) => void;
  setTempUrl: (url: string) => void;
  setTempName: (name: string) => void;
  handleUrlSubmit: (id: number) => void;
  handleNameSubmit: (id: number) => void;
  onSnapshot: (id: number) => void;
  startStream: (id: number, url: string) => void;
  stopStream: (id: number) => void;
  resetCamera: (id: number) => void;
  MAX_RETRIES: number;
  onLog?: (msg: string) => void;
  videoRefs: React.MutableRefObject<Record<number, HTMLVideoElement | null>>;
}

export const CameraTile: React.FC<CameraTileProps> = ({
  cameraId,
  url,
  name,
  isActive,
  isEditing,
  isEditingName,
  cameraState,
  tempUrl,
  tempName,
  setEditingCamera,
  setEditingName,
  setTempUrl,
  setTempName,
  handleUrlSubmit,
  handleNameSubmit,
  onSnapshot,
  startStream,
  stopStream,
  resetCamera,
  MAX_RETRIES,
  onLog,
  videoRefs,
}) => {
  const [resolutionProfile, setResolutionProfile] = React.useState<ResolutionProfile>('medium');

  const handleResolutionChange = (profile: ResolutionProfile) => {
    setResolutionProfile(profile);
    // Save to localStorage for persistence
    localStorage.setItem(`camera-${cameraId}-resolution`, profile);
    
    // If stream is active, restart with new profile
    if (isActive && url) {
      onLog?.(`Switching Camera ${cameraId} to ${profile} quality`);
      stopStream(cameraId);
      // Small delay to ensure clean restart
      setTimeout(() => {
        startStream(cameraId, url);
      }, 500);
    }
  };

  // Load saved resolution profile on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(`camera-${cameraId}-resolution`) as ResolutionProfile;
    if (saved && ['low', 'medium', 'high'].includes(saved)) {
      setResolutionProfile(saved);
    }
  }, [cameraId]);

  const getStatusColor = () => {
    if (isActive && cameraState.hlsAvailable) return "bg-green-500";
    if (isActive && !cameraState.hlsAvailable) return "bg-orange-500";
    switch (cameraState.connectionStatus) {
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    if (isActive && cameraState.hlsAvailable) return "Live";
    if (isActive && !cameraState.hlsAvailable) return "Converting...";
    switch (cameraState.connectionStatus) {
      case "connecting": return "Connecting...";
      case "failed": return `Failed (${cameraState.retryCount}/${MAX_RETRIES})`;
      default: return "Stopped";
    }
  };

  return (
    <div
      key={cameraId}
      className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col"
    >
      {/* Camera Header */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-2 flex-1">
          <Camera className="w-4 h-4" />
          {isEditingName ? (
            <div className="flex items-center space-x-1 flex-1">
              <Input
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                className="h-6 text-xs py-1 px-2"
                placeholder="Camera name"
                onKeyPress={e => e.key === "Enter" && handleNameSubmit(cameraId)}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNameSubmit(cameraId)}
                className="h-6 w-6 p-0"
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingName(null);
                  setTempName("");
                }}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-sm font-medium truncate">{name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingName(cameraId);
                  setTempName(name);
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-gray-400">{getStatusText()}</span>
          </div>
        </div>
        <div className="flex space-x-1">
          <ResolutionSelector
            currentProfile={resolutionProfile}
            onProfileChange={handleResolutionChange}
            disabled={!url}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSnapshot(cameraId)}
            disabled={!isActive}
            className="h-6 w-6 p-0"
          >
            <Image className="w-3 h-3" />
          </Button>
          {isActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stopStream(cameraId)}
              className="h-6 w-6 p-0"
            >
              <Square className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => url && startStream(cameraId, url)}
              disabled={!url || cameraState.connectionStatus === "connecting"}
              className="h-6 w-6 p-0"
            >
              <Play className="w-3 h-3" />
            </Button>
          )}
          {cameraState.retryCount >= MAX_RETRIES && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetCamera(cameraId)}
              className="h-6 w-6 p-0 text-orange-400"
              title="Reset camera (exceeded max retries)"
            >
              <AlertTriangle className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative group">
        {isActive ? (
          <video
            ref={el => {
              videoRefs.current[cameraId] = el;
            }}
            className="w-full h-full object-cover bg-black"
            autoPlay
            muted
            playsInline
            controls={false}
            // Event handlers can be passed via props/hook if needed
          >
            Your browser does not support HLS video playback.
          </video>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="text-center">
              <Camera className="w-8 h-8 mx-auto mb-2 text-gray-500" />
              <p className="text-sm text-gray-400">
                {cameraState.connectionStatus === "failed" && cameraState.lastError
                  ? `Error: ${cameraState.lastError}`
                  : url
                  ? `Stream ${cameraState.connectionStatus}`
                  : "No URL Set"}
              </p>
              {cameraState.retryCount >= MAX_RETRIES && (
                <p className="text-xs text-orange-400 mt-1">
                  Max retries reached. Click ⚠️ to reset.
                </p>
              )}
              {isActive && !cameraState.hlsAvailable && (
                <p className="text-xs text-yellow-400 mt-1">
                  FFmpeg processing RTSP stream...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="p-2 bg-gray-900 border-t border-gray-700">
        {isEditing ? (
          <div className="flex space-x-2">
            <Input
              value={tempUrl}
              onChange={e => setTempUrl(e.target.value)}
              placeholder="rtsp://username:password@ip:port/path"
              className="text-xs"
              onKeyPress={e => e.key === "Enter" && handleUrlSubmit(cameraId)}
              autoFocus
            />
            <Button size="sm" onClick={() => handleUrlSubmit(cameraId)} className="px-2">
              Save
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingCamera(cameraId);
              setTempUrl(url || "");
            }}
            className="w-full text-left text-xs text-gray-400 hover:text-white truncate"
          >
            {url || "Click to set RTSP URL"}
          </button>
        )}
      </div>
    </div>
  );
};
