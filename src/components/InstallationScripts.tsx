
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Download, Server } from 'lucide-react';
import ScriptDisplay from '@/components/ScriptDisplay';
import InstallationNotes from '@/components/InstallationNotes';
import { installationScripts, scriptMetadata } from '@/data/installationScripts';

const InstallationScripts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Installation Scripts</h2>
        <p className="text-muted-foreground">
          Ready-to-use installation scripts for deploying JERICHO Security System across different platforms.
        </p>
      </div>

      <Tabs defaultValue="linux" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="linux" className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>Linux</span>
          </TabsTrigger>
          <TabsTrigger value="esxiUbuntu" className="flex items-center space-x-2">
            <Server className="w-4 h-4" />
            <span>ESXi</span>
          </TabsTrigger>
          <TabsTrigger value="windows" className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>Windows</span>
          </TabsTrigger>
          <TabsTrigger value="macos" className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>macOS</span>
          </TabsTrigger>
          <TabsTrigger value="docker" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Docker</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Compose</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="linux">
          <ScriptDisplay
            scriptKey="linux"
            script={installationScripts.linux}
            title={scriptMetadata.linux.name}
            description={scriptMetadata.linux.description}
            icon="terminal"
            prerequisites={scriptMetadata.linux.requirements.join(', ')}
            features={scriptMetadata.linux.features}
          />
        </TabsContent>

        <TabsContent value="esxiUbuntu">
          <ScriptDisplay
            scriptKey="esxiUbuntu"
            script={installationScripts.esxiUbuntu}
            title={scriptMetadata.esxiUbuntu.name}
            description={scriptMetadata.esxiUbuntu.description}
            icon="terminal"
            prerequisites={scriptMetadata.esxiUbuntu.requirements.join(', ')}
            features={scriptMetadata.esxiUbuntu.features}
          />
        </TabsContent>

        <TabsContent value="windows">
          <ScriptDisplay
            scriptKey="windows"
            script={installationScripts.windows}
            title={scriptMetadata.windows.name}
            description={scriptMetadata.windows.description}
            icon="terminal"
            prerequisites={scriptMetadata.windows.requirements.join(', ')}
            features={scriptMetadata.windows.features}
          />
        </TabsContent>

        <TabsContent value="macos">
          <ScriptDisplay
            scriptKey="macos"
            script={installationScripts.macos}
            title={scriptMetadata.macos.name}
            description={scriptMetadata.macos.description}
            icon="terminal"
            prerequisites={scriptMetadata.macos.requirements.join(', ')}
            features={scriptMetadata.macos.features}
          />
        </TabsContent>

        <TabsContent value="docker">
          <ScriptDisplay
            scriptKey="docker"
            script={installationScripts.docker}
            title={scriptMetadata.docker.name}
            description={scriptMetadata.docker.description}
            icon="download"
            prerequisites={scriptMetadata.docker.requirements.join(', ')}
            features={scriptMetadata.docker.features}
          />
        </TabsContent>

        <TabsContent value="compose">
          <ScriptDisplay
            scriptKey="dockerCompose"
            script={installationScripts.dockerCompose}
            title={scriptMetadata.dockerCompose.name}
            description={scriptMetadata.dockerCompose.description}
            icon="download"
            prerequisites={scriptMetadata.dockerCompose.requirements.join(', ')}
            features={scriptMetadata.dockerCompose.features}
          />
        </TabsContent>
      </Tabs>

      <InstallationNotes />
    </div>
  );
};

export default InstallationScripts;
