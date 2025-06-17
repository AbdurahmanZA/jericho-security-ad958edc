
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const PasswordManager: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const users = [
    { value: 'asolomon', label: 'Administrator Solomon (asolomon)' },
    { value: 'admin', label: 'System Administrator (admin)' },
  ];

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  const changePassword = async () => {
    if (!selectedUser) {
      toast({
        title: "Select User",
        description: "Please select a user to change password for",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    setIsChanging(true);

    try {
      // In a real app, this would call an API
      // For demo purposes, we'll simulate the password change
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Store in localStorage (in production, this would be handled by backend)
      const passwordData = {
        userId: selectedUser,
        changedBy: user?.username,
        changedAt: new Date().toISOString(),
        // Note: Never store actual passwords in localStorage in production
      };
      
      localStorage.setItem(`jericho-password-${selectedUser}`, JSON.stringify(passwordData));

      toast({
        title: "Password Changed",
        description: `Password successfully changed for ${selectedUser}`,
      });

      // Reset form
      setSelectedUser('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: "An error occurred while changing the password",
        variant: "destructive",
      });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold uppercase tracking-wide">Password Management</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Change passwords for system users (Superuser access required)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change User Password
          </CardTitle>
          <CardDescription>
            Select a user and set a new password. Strong passwords are recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="user-select">Select User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose user to change password for" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.value} value={user.value}>
                    {user.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={changePassword}
              disabled={isChanging || !selectedUser || !newPassword}
              className="jericho-btn-primary"
            >
              <Shield className="w-4 h-4 mr-2" />
              {isChanging ? 'Changing...' : 'Change Password'}
            </Button>
            <Button
              variant="outline"
              onClick={generateStrongPassword}
              type="button"
            >
              Generate Strong Password
            </Button>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <h5 className="font-semibold mb-2">Password Requirements</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Minimum 8 characters</li>
              <li>• Mix of uppercase and lowercase letters</li>
              <li>• Include numbers and special characters</li>
              <li>• Avoid common words or personal information</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
