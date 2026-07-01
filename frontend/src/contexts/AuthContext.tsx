import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Dummy user for development ──────────────────────────────
const DUMMY_USER: User = {
  id: '42b8ef1f-6de3-4b33-b567-1b1200bdb526',
  email: 'demo@resuflow.dev',
  created_at: '2026-06-15T10:30:00Z',
};

const DUMMY_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MmI4ZWYxZi02ZGUzLTRiMzMtYjU2Ny0xYjEyMDBiZGI1MjYiLCJleHAiOjk5OTk5OTk5OTl9.dummy';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('resuflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('resuflow_token');
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    // TODO: Replace with actual API call
    // const res = await fetch('/api/v1/auth/login', { ... });
    await new Promise((r) => setTimeout(r, 800)); // simulate network delay
    setUser(DUMMY_USER);
    setToken(DUMMY_TOKEN);
    localStorage.setItem('resuflow_user', JSON.stringify(DUMMY_USER));
    localStorage.setItem('resuflow_token', DUMMY_TOKEN);
    setIsLoading(false);
  }, []);

  const signup = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    // TODO: Replace with actual API call
    // const res = await fetch('/api/v1/auth/register', { ... });
    await new Promise((r) => setTimeout(r, 1000)); // simulate network delay
    setUser(DUMMY_USER);
    setToken(DUMMY_TOKEN);
    localStorage.setItem('resuflow_user', JSON.stringify(DUMMY_USER));
    localStorage.setItem('resuflow_token', DUMMY_TOKEN);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('resuflow_user');
    localStorage.removeItem('resuflow_token');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
