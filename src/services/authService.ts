
import { User } from '@/types/auth';

// In a production environment, this would connect to a real backend
const USERS: Record<string, { password: string; user: Omit<User, 'lastLogin'> }> = {
  asolomon: {
    password: 'JerichoSuperAdmin2024!',
    user: {
      id: '1',
      username: 'asolomon',
      role: 'superuser',
      fullName: 'Administrator Solomon',
      email: 'asolomon@jericho-security.com',
      isActive: true,
    },
  },
  admin: {
    password: 'JerichoAdmin2024!',
    user: {
      id: '2',
      username: 'admin',
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@jericho-security.com',
      isActive: true,
    },
  },
};

export const authService = {
  async authenticate(username: string, password: string): Promise<User | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const userRecord = USERS[username];
    if (!userRecord || userRecord.password !== password) {
      return null;
    }

    const user: User = {
      ...userRecord.user,
      lastLogin: new Date(),
    };

    // Store in localStorage (in production, use secure tokens)
    localStorage.setItem('jericho_user', JSON.stringify(user));
    localStorage.setItem('jericho_session', `session_${Date.now()}`);
    
    return user;
  },

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('jericho_user');
      const session = localStorage.getItem('jericho_session');
      
      if (!userStr || !session) return null;
      
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('jericho_user');
    localStorage.removeItem('jericho_session');
  },

  hasPermission(user: User | null, module: string): boolean {
    if (!user || !user.isActive) return false;
    
    // Superuser has access to everything
    if (user.role === 'superuser') return true;
    
    // Admin users cannot access integrations
    if (user.role === 'admin') {
      const restrictedModules = ['integrations', 'hikvision-setup', 'hik-connect'];
      return !restrictedModules.includes(module.toLowerCase());
    }
    
    return false;
  }
};
