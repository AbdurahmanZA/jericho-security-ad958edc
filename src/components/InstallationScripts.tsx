
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Download } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="linux" className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span>Linux</span>
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
            title={scriptMetadata.linux.title}
            description={scriptMetadata.linux.description}
            icon="terminal"
            prerequisites={scriptMetadata.linux.prerequisites}
            usage={scriptMetadata.linux.usage}
            features={scriptMetadata.linux.features}
          />
        </TabsContent>

        <TabsContent value="windows">
          <ScriptDisplay
            scriptKey="windows"
            script={installationScripts.windows}
            title={scriptMetadata.windows.title}
            description={scriptMetadata.windows.description}
            icon="terminal"
            prerequisites={scriptMetadata.windows.prerequisites}
            usage={scriptMetadata.windows.usage}
          />
        </TabsContent>

        <TabsContent value="macos">
          <ScriptDisplay
            scriptKey="macos"
            script={installationScripts.macos}
            title={scriptMetadata.macos.title}
            description={scriptMetadata.macos.description}
            icon="terminal"
            prerequisites={scriptMetadata.macos.prerequisites}
            usage={scriptMetadata.macos.usage}
          />
        </TabsContent>

        <TabsContent value="docker">
          <ScriptDisplay
            scriptKey="docker"
            script={installationScripts.docker}
            title={scriptMetadata.docker.title}
            description={scriptMetadata.docker.description}
            icon="download"
            prerequisites={scriptMetadata.docker.prerequisites}
            ports={scriptMetadata.docker.ports}
          />
        </TabsContent>

        <TabsContent value="compose">
          <ScriptDisplay
            scriptKey="compose"
            script={installationScripts.dockerCompose}
            title={scriptMetadata.compose.title}
            description={scriptMetadata.compose.description}
            icon="download"
            prerequisites={scriptMetadata.compose.prerequisites}
            usage={scriptMetadata.compose.usage}
          />
        </TabsContent>
      </Tabs>

      <InstallationNotes />
    </div>
  );
};

export default InstallationScripts;
