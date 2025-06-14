import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Terminal, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InstallationScripts = () => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, scriptName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptName);
      setTimeout(() => setCopiedScript(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: `${scriptName} installation script copied`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the script manually",
        variant: "destructive",
      });
    }
  };

  const scripts = {
    linux: `#!/bin/bash
# JERICHO Security System - Linux Installation Script
sudo systemctl stop apache2 && \\
sudo rm -rf /var/www/html/* && \\
sudo chown -R www-data:www-data /var/www/html/ && \\
sudo rm -rf jericho-security-system
git clone https://github.com/abdurahmanza/jericho-security-system.git && \\
cd jericho-security-system/ && \\
npm install && \\
npm run build && \\
sudo cp -r dist/* /var/www/html/ && \\
sudo systemctl restart apache2`,

    windows: `@echo off
REM JERICHO Security System - Windows Installation Script
echo Stopping IIS if running...
iisreset /stop

echo Cleaning web directory...
rmdir /s /q "C:\\inetpub\\wwwroot\\*"

echo Removing old installation...
rmdir /s /q jericho-security-system

echo Cloning repository...
git clone https://github.com/abdurahmanza/jericho-security-system.git
cd jericho-security-system

echo Installing dependencies...
npm install

echo Building application...
npm run build

echo Copying files to web directory...
xcopy /s /y dist\\* "C:\\inetpub\\wwwroot\\"

echo Starting IIS...
iisreset /start

echo Installation complete!`,

    macos: `#!/bin/bash
# JERICHO Security System - macOS Installation Script
# Install Homebrew if not present
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    brew install nginx
fi

# Stop nginx
sudo brew services stop nginx

# Clean web directory
sudo rm -rf /usr/local/var/www/*
sudo rm -rf jericho-security-system

# Clone and build
git clone https://github.com/abdurahmanza/jericho-security-system.git && \\
cd jericho-security-system/ && \\
npm install && \\
npm run build && \\
sudo cp -r dist/* /usr/local/var/www/ && \\
sudo brew services start nginx`,

    docker: `# JERICHO Security System - Docker Installation
# Create docker-compose.yml file first, then run:

docker-compose down
docker-compose pull
docker-compose up -d

# Or using Docker directly:
docker stop jericho-security || true
docker rm jericho-security || true
docker pull abdurahmanza/jericho-security-system:latest
docker run -d \\
  --name jericho-security \\
  -p 3000:3000 \\
  -p 3001:3001 \\
  -v jericho-data:/app/data \\
  --restart unless-stopped \\
  abdurahmanza/jericho-security-system:latest`,

    dockerCompose: `version: '3.8'

services:
  jericho-security:
    image: abdurahmanza/jericho-security-system:latest
    container_name: jericho-security
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - jericho-data:/app/data
      - jericho-config:/app/config
    environment:
      - NODE_ENV=production
      - WEBSOCKET_PORT=3001
    restart: unless-stopped
    networks:
      - jericho-network

  nginx:
    image: nginx:alpine
    container_name: jericho-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - jericho-security
    networks:
      - jericho-network

volumes:
  jericho-data:
  jericho-config:

networks:
  jericho-network:
    driver: bridge`
  };

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Terminal className="w-5 h-5" />
                <span>Linux Installation (Ubuntu/Debian)</span>
              </CardTitle>
              <CardDescription>
                Bash script for Apache2 web server deployment. Requires sudo privileges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{scripts.linux}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(scripts.linux, 'Linux')}
                >
                  {copiedScript === 'Linux' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Prerequisites:</strong> Git, Node.js, npm, Apache2</p>
                <p><strong>Usage:</strong> Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="windows">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Terminal className="w-5 h-5" />
                <span>Windows Installation</span>
              </CardTitle>
              <CardDescription>
                Batch script for IIS web server deployment. Run as Administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{scripts.windows}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(scripts.windows, 'Windows')}
                >
                  {copiedScript === 'Windows' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Prerequisites:</strong> Git, Node.js, npm, IIS</p>
                <p><strong>Usage:</strong> Save as install.bat and run as Administrator</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Terminal className="w-5 h-5" />
                <span>macOS Installation</span>
              </CardTitle>
              <CardDescription>
                Bash script using Homebrew and Nginx. Installs dependencies automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{scripts.macos}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(scripts.macos, 'macOS')}
                >
                  {copiedScript === 'macOS' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Prerequisites:</strong> Xcode Command Line Tools</p>
                <p><strong>Usage:</strong> Save as install.sh, make executable with chmod +x install.sh, then run ./install.sh</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docker">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Docker Installation</span>
              </CardTitle>
              <CardDescription>
                Docker commands for containerized deployment. Cross-platform solution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{scripts.docker}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(scripts.docker, 'Docker')}
                >
                  {copiedScript === 'Docker' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Prerequisites:</strong> Docker Engine</p>
                <p><strong>Ports:</strong> 3000 (Web UI), 3001 (WebSocket)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Docker Compose</span>
              </CardTitle>
              <CardDescription>
                Complete docker-compose.yml for production deployment with Nginx reverse proxy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{scripts.dockerCompose}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(scripts.dockerCompose, 'Docker Compose')}
                >
                  {copiedScript === 'Docker Compose' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Prerequisites:</strong> Docker, Docker Compose</p>
                <p><strong>Usage:</strong> Save as docker-compose.yml, then run docker-compose up -d</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="text-orange-800 dark:text-orange-200">
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-orange-700 dark:text-orange-300">
          <ul className="space-y-2">
            <li>• Ensure all prerequisites are installed before running scripts</li>
            <li>• Run with appropriate privileges (sudo/Administrator)</li>
            <li>• Test in a development environment first</li>
            <li>• Configure firewall rules for ports 3000 and 3001</li>
            <li>• For production, consider using HTTPS and proper SSL certificates</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallationScripts;
