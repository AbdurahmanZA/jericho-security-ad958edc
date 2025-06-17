
import React from "react"
import { Puzzle, Terminal, Users, Shield, Camera, Mic, Database, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { HikConnectIntegration } from "@/components/HikConnectIntegration"
import { HikvisionSettings } from "@/components/HikvisionSettings"
import { MultiHikConnectManager } from "@/components/MultiHikConnectManager"
import InstallationScripts from "@/components/InstallationScripts"
import { SipSettings } from "@/components/SipSettings"
import { BackupRestore } from "@/components/BackupRestore"
import { AISettings } from "@/components/AISettings"
import { EnhancedAISettings } from "@/components/EnhancedAISettings"
import { PasswordManager } from "@/components/PasswordManager"
import LeadManagement from "@/components/LeadManagement"
import { EmergencyContacts } from "@/components/EmergencyContacts"
import ProtectedRoute from "@/components/ProtectedRoute"
import UserProfile from "@/components/UserProfile"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"

const Settings = () => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const isSuperUser = user?.role === 'superuser';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Sidebar>
          <SidebarContent className="p-4 space-y-6">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
                    onClick={() => navigate('/')}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Camera View
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-jericho-primary text-white border-jericho-primary hover:bg-jericho-dark-teal"
                    onClick={() => navigate('/multiview')}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Multi View
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>User Information</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="text-sm text-slate-400 space-y-2">
                  <div>User: {user?.username}</div>
                  <div>Role: {user?.role}</div>
                  <div className="text-xs">Access Level: {user?.permissions?.length || 0} modules</div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          {/* Header with consistent styling */}
          <div className="border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger className="text-white hover:bg-slate-700" />
                  <div className="flex items-center space-x-4">
                    {/* Persistent Logo */}
                    <div className="w-12 h-12 bg-slate-800 rounded-lg p-2">
                      <img 
                        src="/lovable-uploads/7cca0fa7-2e1b-4160-9134-844eadbfaf2d.png" 
                        alt="Jericho Security Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">
                        JERICHO SETTINGS
                      </h1>
                      <p className="text-sm text-slate-400">
                        System Configuration & Management
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 container mx-auto px-6 py-8">
            <Tabs defaultValue="cameras" className="space-y-6">
              <TabsList className={`grid w-full ${isSuperUser ? 'grid-cols-8' : 'grid-cols-4'}`}>
                <TabsTrigger value="cameras" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Cameras
                </TabsTrigger>
                <TabsTrigger value="streams">Streams</TabsTrigger>
                {hasPermission('integrations') && (
                  <TabsTrigger value="integrations" className="flex items-center gap-2">
                    <Puzzle className="w-4 h-4" />
                    Integrations
                  </TabsTrigger>
                )}
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  AI System
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Profile
                </TabsTrigger>
                
                {/* Superuser-only tabs */}
                {isSuperUser && (
                  <>
                    <TabsTrigger value="sip" className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      SIP/VoIP
                    </TabsTrigger>
                    <TabsTrigger value="scripts" className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      Scripts
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Users
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Backup
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="cameras" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Camera Management
                    </CardTitle>
                    <CardDescription>
                      Configure and manage your security cameras and video sources.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Camera configuration is handled through the main camera interface. 
                      Return to the Camera View to add, configure, or manage cameras.
                    </p>
                    <Button 
                      className="mt-4 bg-jericho-primary hover:bg-jericho-dark-teal"
                      onClick={() => navigate('/')}
                    >
                      Go to Camera View
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="streams" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stream Settings</CardTitle>
                    <CardDescription>
                      Configure streaming protocols and quality settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Stream settings and configuration options.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {hasPermission('integrations') && (
                <TabsContent value="integrations" className="space-y-6">
                  <ProtectedRoute requiredModule="integrations">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Puzzle className="h-5 w-5" />
                          External Integrations
                        </CardTitle>
                        <CardDescription>
                          Configure third-party integrations and APIs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <HikvisionSettings />
                          <Separator />
                          <HikConnectIntegration />
                          <Separator />
                          <MultiHikConnectManager />
                        </div>
                      </CardContent>
                    </Card>
                  </ProtectedRoute>
                </TabsContent>
              )}

              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      AI & Machine Learning
                    </CardTitle>
                    <CardDescription>
                      Configure artificial intelligence and automation features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <EnhancedAISettings />
                      <Separator />
                      <AISettings />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <UserProfile />
              </TabsContent>

              {/* Superuser-only content */}
              {isSuperUser && (
                <>
                  <TabsContent value="sip" className="space-y-6">
                    <ProtectedRoute requiredModule="sip">
                      <SipSettings />
                    </ProtectedRoute>
                  </TabsContent>

                  <TabsContent value="scripts" className="space-y-6">
                    <ProtectedRoute requiredModule="scripts">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Installation Scripts
                          </CardTitle>
                          <CardDescription>
                            Download and run installation scripts for various platforms
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <InstallationScripts />
                        </CardContent>
                      </Card>
                    </ProtectedRoute>
                  </TabsContent>

                  <TabsContent value="users" className="space-y-6">
                    <ProtectedRoute requiredModule="users">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            User Management
                          </CardTitle>
                          <CardDescription>
                            Manage system users, roles, and permissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <PasswordManager />
                            <Separator />
                            <LeadManagement />
                            <Separator />
                            <EmergencyContacts />
                          </div>
                        </CardContent>
                      </Card>
                    </ProtectedRoute>
                  </TabsContent>

                  <TabsContent value="backup" className="space-y-6">
                    <ProtectedRoute requiredModule="backup">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Backup & Restore
                          </CardTitle>
                          <CardDescription>
                            Backup system configuration and restore from previous backups
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <BackupRestore />
                        </CardContent>
                      </Card>
                    </ProtectedRoute>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
