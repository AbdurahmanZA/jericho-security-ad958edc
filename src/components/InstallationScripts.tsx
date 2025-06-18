
import React from 'react';
import { Terminal } from 'lucide-react';
import ScriptDisplay from '@/components/ScriptDisplay';
import InstallationNotes from '@/components/InstallationNotes';
import { installationScripts, scriptMetadata } from '@/data/installationScripts';

const InstallationScripts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Installation Script</h2>
        <p className="text-muted-foreground">
          Simplified, self-contained installation script for Ubuntu 24.04 LTS. No additional scripts or updates needed after installation.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="text-amber-600 mt-0.5">⚠️</div>
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">Simplified Installation</h3>
            <p className="text-amber-700 text-sm">
              This streamlined script installs everything needed in one go. Future updates will be handled through the web interface, 
              eliminating the need for additional installation scripts.
            </p>
          </div>
        </div>
      </div>

      <ScriptDisplay
        scriptKey="linux"
        script={installationScripts.linux}
        title={scriptMetadata.linux.name}
        description={scriptMetadata.linux.description}
        icon="terminal"
        prerequisites={scriptMetadata.linux.requirements.join(', ')}
        features={scriptMetadata.linux.features}
      />

      <InstallationNotes />
    </div>
  );
};

export default InstallationScripts;
