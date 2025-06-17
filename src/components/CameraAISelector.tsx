
import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Eye } from 'lucide-react';

interface CameraAISelectorProps {
  selectedCameras: number[];
  onSelectionChange: (cameras: number[]) => void;
}

export const CameraAISelector: React.FC<CameraAISelectorProps> = ({
  selectedCameras,
  onSelectionChange
}) => {
  // Get available cameras from localStorage or default to 8 cameras
  const [availableCameras, setAvailableCameras] = useState<number[]>([]);

  useEffect(() => {
    // Load configured cameras from localStorage
    const savedCameras = localStorage.getItem('jericho-cameras');
    if (savedCameras) {
      try {
        const cameras = JSON.parse(savedCameras);
        const cameraIds = Object.keys(cameras).map(Number).filter(id => cameras[id].url);
        setAvailableCameras(cameraIds.length > 0 ? cameraIds : [1, 2, 3, 4, 5, 6, 7, 8]);
      } catch {
        setAvailableCameras([1, 2, 3, 4, 5, 6, 7, 8]);
      }
    } else {
      setAvailableCameras([1, 2, 3, 4, 5, 6, 7, 8]);
    }
  }, []);

  const handleCameraToggle = (cameraId: number, checked: boolean) => {
    const updatedSelection = checked
      ? [...selectedCameras, cameraId]
      : selectedCameras.filter(id => id !== cameraId);
    onSelectionChange(updatedSelection);
  };

  const toggleAll = () => {
    if (selectedCameras.length === availableCameras.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(availableCameras);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Camera Selection for AI Processing
        </CardTitle>
        <CardDescription>
          Select which cameras to apply AI motion detection and object recognition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <Label className="font-medium">Select Cameras:</Label>
          <button
            onClick={toggleAll}
            className="text-sm text-primary hover:underline"
          >
            {selectedCameras.length === availableCameras.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {availableCameras.map((cameraId) => (
            <div key={cameraId} className="flex items-center space-x-2 p-2 border rounded">
              <Checkbox
                id={`camera-${cameraId}`}
                checked={selectedCameras.includes(cameraId)}
                onCheckedChange={(checked) => handleCameraToggle(cameraId, checked as boolean)}
              />
              <Label 
                htmlFor={`camera-${cameraId}`} 
                className="flex items-center gap-1 cursor-pointer"
              >
                <Camera className="h-3 w-3" />
                Camera {cameraId}
              </Label>
            </div>
          ))}
        </div>
        
        {selectedCameras.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedCameras.length} camera{selectedCameras.length !== 1 ? 's' : ''} selected for AI processing
          </div>
        )}
      </CardContent>
    </Card>
  );
};
