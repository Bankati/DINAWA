'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';

export type UserRole = 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN';

export interface WARAHUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string | null;
  accountStatus?: string;
}

const ROLE_ROUTES: Record<string, string> = {
  OWNER: '/dashboard',
  TENANT: '/locataire',
  MANAGER: '/gestionnaire/dashboard',
  ADMIN: '/admin',
};

// Fonction pure indépendante du contexte — évite de lire `user` juste après
// login(), où le state React n'a pas encore re-rendu (closure obsolète).
export function roleDefaultRoute(role: UserRole): string {
  return ROLE_ROUTES[role] ?? '/dashboard';
}

const TOKEN_KEY = 'warah_access_token';
const REFRESH_KEY = 'warah_refresh_token';
const USER_KEY = 'warah_user';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: WARAHUser;
}

interface AuthContextValue {
  user: WARAHUser | null;
  isLoading: boolean;
  isLoggedIn: () => boolean;
  login: (email: string, password: string) => Promise<WARAHUser>;
  logout: () => void;
  getDefaultRoute: () => string;
  // Compteur incrémenté après une modification du profil (ex. nouvelle photo)
  // — permet à AppShell de rafraîchir l'avatar de la navbar immédiatement,
  // sans navigation ni rechargement de page.
  profileVersion: number;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WARAHUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);
  const router = useRouter();

  const refreshProfile = useCallback(() => setProfileVersion((v) => v + 1), []);

  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (raw && token) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const isLoggedIn = useCallback(() => !!localStorage.getItem(TOKEN_KEY), []);

  const getDefaultRoute = useCallback(() => {
    return user ? (ROLE_ROUTES[user.role] ?? '/dashboard') : '/auth/login';
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isLoggedIn, login, logout, getDefaultRoute, profileVersion, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

export { ApiError };
