
import React from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClearConnectionsButtonProps {
  onClearAll: () => void;
}

export const ClearConnectionsButton: React.FC<ClearConnectionsButtonProps> = ({
  onClearAll
}) => {
  const { toast } = useToast();

  const handleClearAll = () => {
    onClearAll();
    toast({
      title: "All Connections Cleared",
      description: "All camera streams have been stopped",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClearAll}
      className="bg-red-600 text-white border-red-600 hover:bg-red-700"
    >
      <Square className="w-4 h-4 mr-2" />
      Clear All
    </Button>
  );
};
