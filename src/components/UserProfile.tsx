
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield, Settings } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superuser':
        return <Badge variant="destructive" className="ml-2">Super User</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="ml-2">Administrator</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">User</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          User Profile
        </CardTitle>
        <CardDescription>
          Current session information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Username:</span>
          <div className="flex items-center">
            <span>{user.username}</span>
            {getRoleBadge(user.role)}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium">Full Name:</span>
          <span>{user.fullName}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-medium">Email:</span>
          <span>{user.email}</span>
        </div>
        
        {user.lastLogin && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Login:</span>
            <span className="text-sm text-muted-foreground">
              {user.lastLogin.toLocaleString()}
            </span>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            variant="destructive" 
            onClick={logout}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
