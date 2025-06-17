
export interface User {
  id: string;
  username: string;
  role: 'superuser' | 'admin' | 'user';
  fullName: string;
  email: string;
  lastLogin?: Date;
  isActive: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (module: string) => boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
