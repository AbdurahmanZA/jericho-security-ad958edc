
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HikConnectAccount {
  id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  isActive: boolean;
  lastSync?: Date;
}

export const MultiHikConnectManager: React.FC = () => {
  const [accounts, setAccounts] = useState<HikConnectAccount[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    apiKey: '',
    secretKey: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedAccounts = localStorage.getItem('jericho-hikconnect-accounts');
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  const saveAccounts = (updatedAccounts: HikConnectAccount[]) => {
    setAccounts(updatedAccounts);
    localStorage.setItem('jericho-hikconnect-accounts', JSON.stringify(updatedAccounts));
  };

  const addAccount = () => {
    if (!newAccount.name || !newAccount.apiKey || !newAccount.secretKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const account: HikConnectAccount = {
      id: Date.now().toString(),
      name: newAccount.name,
      apiKey: newAccount.apiKey,
      secretKey: newAccount.secretKey,
      isActive: accounts.length === 0, // First account is active by default
    };

    saveAccounts([...accounts, account]);
    setNewAccount({ name: '', apiKey: '', secretKey: '' });
    setIsAdding(false);
    
    toast({
      title: "Account Added",
      description: `${newAccount.name} has been added successfully`,
    });
  };

  const removeAccount = (id: string) => {
    const updatedAccounts = accounts.filter(account => account.id !== id);
    saveAccounts(updatedAccounts);
    
    toast({
      title: "Account Removed",
      description: "Hik-Connect account has been removed",
    });
  };

  const toggleActive = (id: string) => {
    const updatedAccounts = accounts.map(account => ({
      ...account,
      isActive: account.id === id ? !account.isActive : account.isActive
    }));
    saveAccounts(updatedAccounts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Multiple Hik-Connect Accounts</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage multiple Hik-Connect integrations
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="jericho-btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Add New Account Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Hik-Connect Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="e.g., Main Office, Branch 1"
              />
            </div>
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={newAccount.apiKey}
                onChange={(e) => setNewAccount({ ...newAccount, apiKey: e.target.value })}
                type="password"
              />
            </div>
            <div>
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                value={newAccount.secretKey}
                onChange={(e) => setNewAccount({ ...newAccount, secretKey: e.target.value })}
                type="password"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={addAccount} className="jericho-btn-primary">
                Add Account
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className="font-semibold">{account.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      API: {account.apiKey.substring(0, 8)}...
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(account.id)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeAccount(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {accounts.length === 0 && !isAdding && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No Hik-Connect accounts configured</p>
              <Button 
                onClick={() => setIsAdding(true)} 
                className="mt-4 jericho-btn-primary"
              >
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
