'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, vaultApi, setAuthToken, clearAuthToken } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE' | 'ORGANIZATION';
  salt: string;
  totpEnabled: boolean;
  autoLockMinutes: number;
  themePreference: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  register: (email: string, fullName: string, masterPassword: string) => Promise<{ recoveryCode?: string; user: UserProfile }>;
  login: (email: string, masterPassword: string) => Promise<UserProfile>;
  logout: () => void;
}

const STORAGE_KEY = 'vaultiq_user';
const TOKEN_COOKIE = 'vaultiq_token';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  register: async () => ({} as any),
  login: async () => ({} as any),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${TOKEN_COOKIE}=`))
          ?.split('=')[1];
        if (token) setAuthToken(token);
      }
    } catch {}
    setLoading(false);
  }, []);

  const persistSession = (token: string, userObj: UserProfile) => {
    setAuthToken(token);
    document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${15 * 60}; SameSite=Strict`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    setUser(userObj);
  };

  const register = async (
    email: string,
    fullName: string,
    masterPassword: string,
  ): Promise<{ recoveryCode?: string; user: UserProfile }> => {
    const data = await authApi.register(email, fullName, masterPassword);
    persistSession(data.access_token, data.user);
    router.push('/dashboard');
    return { recoveryCode: data.user.recoveryCode, user: data.user };
  };

  const login = async (email: string, masterPassword: string): Promise<UserProfile> => {
    const data = await authApi.login(email, masterPassword);
    persistSession(data.access_token, data.user);
    router.push('/dashboard');
    return data.user;
  };

  const logout = () => {
    authApi.logout().catch(() => {}); // best-effort server-side revoke
    clearAuthToken();
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
