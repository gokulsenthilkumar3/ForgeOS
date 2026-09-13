'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

interface AuthContextValue {
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('dbpulse_token');
    if (stored) setTokenState(stored);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.signIn(email, password);
    setToken(res.accessToken);
    setTokenState(res.accessToken);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setTokenState(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ token, signIn, signOut, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
