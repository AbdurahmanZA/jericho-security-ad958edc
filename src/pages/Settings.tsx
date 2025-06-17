
import React from "react"
import { Puzzle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HikConnectIntegration } from "@/components/HikConnectIntegration"
import { HikvisionSettings } from "@/components/HikvisionSettings"
import ProtectedRoute from "@/components/ProtectedRoute";
import UserProfile from "@/components/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { hasPermission } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and set preferences.
          </p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="cameras" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="cameras">Cameras</TabsTrigger>
            <TabsTrigger value="streams">Streams</TabsTrigger>
            <TabsTrigger value="sip">SIP/VoIP</TabsTrigger>
            {hasPermission('integrations') && (
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            )}
            <TabsTrigger value="api-docs">API Docs</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="cameras" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cameras</CardTitle>
                <CardDescription>
                  Manage your cameras and their settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is where you would manage your cameras.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Streams</CardTitle>
                <CardDescription>
                  Manage your streams and their settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is where you would manage your streams.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sip" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SIP/VoIP</CardTitle>
                <CardDescription>
                  Manage your SIP/VoIP settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is where you would manage your SIP/VoIP settings.</p>
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
                    </div>
                  </CardContent>
                </Card>
              </ProtectedRoute>
            </TabsContent>
          )}

          <TabsContent value="api-docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Docs</CardTitle>
                <CardDescription>
                  View the API documentation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>This is where you would view the API documentation.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <UserProfile />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
