import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

export interface WelcomeNotice {
  name: string;
  isNewUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  welcomeNotice: WelcomeNotice | null;
  clearWelcomeNotice: () => void;
  login: (token: string, user: User, isNewUser?: boolean) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('motorent_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [welcomeNotice, setWelcomeNotice] = useState<WelcomeNotice | null>(null);

  const fetchProfile = async () => {
    const savedToken = localStorage.getItem('motorent_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.success && res.data.data) {
        setUser(res.data.data);
      } else {
        logout();
      }
    } catch {
      console.warn('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = (newToken: string, newUser: User, isNewUser = false) => {
    localStorage.setItem('motorent_token', newToken);
    setToken(newToken);
    setUser(newUser);
    const displayName = newUser.firstName || newUser.username || '';
    setWelcomeNotice({ name: displayName, isNewUser });
  };

  const clearWelcomeNotice = () => {
    setWelcomeNotice(null);
  };

  const logout = async () => {
    try {
      const currentToken = localStorage.getItem('motorent_token');
      if (currentToken) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore network/session errors on logout
    } finally {
      localStorage.removeItem('motorent_token');
      setToken(null);
      setUser(null);
      setWelcomeNotice(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        welcomeNotice,
        clearWelcomeNotice,
        login,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
