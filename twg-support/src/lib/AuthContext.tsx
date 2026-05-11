import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('bc_user');
    const storedToken = localStorage.getItem('bc_token');
    
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setProfile(parsedUser as UserProfile);
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('bc_token', token);
    localStorage.setItem('bc_user', JSON.stringify(userData));
    setUser(userData);
    setProfile(userData as UserProfile);
  };

  const logout = () => {
    localStorage.removeItem('bc_token');
    localStorage.removeItem('bc_user');
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isAgent: profile?.role === 'agent' || profile?.role === 'admin',
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
