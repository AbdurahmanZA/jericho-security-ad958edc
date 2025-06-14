import React, { useState } from 'react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarTrigger,
  SidebarInset 
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Settings as SettingsIcon, Camera, Brain, Phone, Database } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HikvisionSettings } from '@/components/HikvisionSettings';
import { AISettings } from '@/components/AISettings';
import { StreamSettings } from '@/components/StreamSettings';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { BackupRestore } from '@/components/BackupRestore';
import { Link } from 'react-router-dom';
import { InstallationScripts } from '@/components/InstallationScripts';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-border jericho-primary-bg">
            <SidebarHeader className="p-4 border-b border-jericho-secondary">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 jericho-gradient rounded-lg flex items-center justify-center jericho-shield">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold jericho-brand text-white">
                    JERICHO
                  </h1>
                  <p className="text-sm jericho-security-text font-semibold tracking-wider">
                    SECURITY
                  </p>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-4 jericho-primary-bg">
              <div className="space-y-4">
                <Link to="/">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-semibold jericho-btn-primary border-jericho-light/30 text-white hover:jericho-accent-bg hover:text-jericho-primary"
                  >
                    <ArrowLeft className="w-3 h-3 mr-2" />
                    BACK TO MONITORING
                  </Button>
                </Link>
                
                <div className="p-4 jericho-secondary-bg rounded-lg border border-jericho-light/20">
                  <h3 className="text-sm font-bold mb-3 text-jericho-very-light uppercase tracking-wider flex items-center">
                    <SettingsIcon className="w-4 h-4 mr-2 text-jericho-accent" />
                    Settings Menu
                  </h3>
                  <div className="space-y-2 text-xs text-jericho-light">
                    <p>• Hikvision Camera Setup</p>
                    <p>• AI Object Recognition</p>
                    <p>• Stream Management</p>
                    <p>• Emergency Contacts</p>
                    <p>• Backup & Restore</p>
                  </div>
                </div>
              </div>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border jericho-secondary-bg">
              <SidebarTrigger className="text-foreground hover:text-jericho-accent" />
              <div className="flex items-center space-x-4 ml-auto">
                <h2 className="text-lg font-bold uppercase tracking-wide text-jericho-very-light">
                  System Settings
                </h2>
                <ThemeToggle />
              </div>
            </header>

            <main className="flex-1 p-6 bg-background">
              <Tabs defaultValue="hikvision" className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="hikvision" className="flex items-center space-x-2">
                    <Camera className="w-4 h-4" />
                    <span>Hikvision</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex items-center space-x-2">
                    <Brain className="w-4 h-4" />
                    <span>AI Recognition</span>
                  </TabsTrigger>
                  <TabsTrigger value="streams" className="flex items-center space-x-2">
                    <SettingsIcon className="w-4 h-4" />
                    <span>Streams</span>
                  </TabsTrigger>
                  <TabsTrigger value="emergency" className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>Emergency</span>
                  </TabsTrigger>
                  <TabsTrigger value="backup" className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Backup</span>
                  </TabsTrigger>
                  <TabsTrigger value="installation" className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Installation</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hikvision">
                  <Card className="p-6">
                    <HikvisionSettings />
                  </Card>
                </TabsContent>

                <TabsContent value="ai">
                  <Card className="p-6">
                    <AISettings />
                  </Card>
                </TabsContent>

                <TabsContent value="streams">
                  <Card className="p-6">
                    <StreamSettings />
                  </Card>
                </TabsContent>

                <TabsContent value="emergency">
                  <Card className="p-6">
                    <EmergencyContacts />
                  </Card>
                </TabsContent>

                <TabsContent value="backup">
                  <Card className="p-6">
                    <BackupRestore />
                  </Card>
                </TabsContent>

                <TabsContent value="installation">
                  <Card className="p-6">
                    <InstallationScripts />
                  </Card>
                </TabsContent>
              </Tabs>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Settings;
