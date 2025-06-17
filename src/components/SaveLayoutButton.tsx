
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SaveLayoutButtonProps {
  layout: number;
  currentPage: number;
  cameraUrls: Record<number, string>;
  cameraNames: Record<number, string>;
}

export const SaveLayoutButton: React.FC<SaveLayoutButtonProps> = ({
  layout,
  currentPage,
  cameraUrls,
  cameraNames
}) => {
  const { toast } = useToast();

  const saveLayout = () => {
    const layoutData = {
      layout,
      currentPage,
      cameraUrls,
      cameraNames,
      savedAt: new Date().toISOString(),
      version: '1.0'
    };

    localStorage.setItem('jericho-saved-layout', JSON.stringify(layoutData));
    
    toast({
      title: "Layout Saved",
      description: `Camera layout (${layout} cameras) saved successfully`,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={saveLayout}
      className="bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
    >
      <Save className="w-4 h-4 mr-2" />
      Save Layout
    </Button>
  );
};
