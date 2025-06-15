
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const InstallationNotes: React.FC = () => {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="text-orange-800 dark:text-orange-200">
          Important Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-orange-700 dark:text-orange-300">
        <ul className="space-y-2">
          <li>• <strong>Update GitHub URL:</strong> Replace placeholder repository URL with your actual repo</li>
          <li>• Ensure all prerequisites are installed before running scripts</li>
          <li>• Run with appropriate privileges (sudo/Administrator)</li>
          <li>• Test in a development environment first</li>
          <li>• Configure firewall rules for ports 80, 443, 3000, and 3001</li>
          <li>• For production, set up SSL certificates (Let's Encrypt recommended)</li>
          <li>• The script creates Apache virtual host and enables required modules</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default InstallationNotes;
