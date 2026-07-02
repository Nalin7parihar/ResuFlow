import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { authApi, ApiError } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('resuflow_token');
  });
  const [isLoading, setIsLoading] = useState(true); // true on mount to validate stored token

  // ── Validate stored token on mount ────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('resuflow_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((userData) => {
        setUser(userData);
        setToken(storedToken);
      })
      .catch(() => {
        // Token expired or invalid — clear everything
        localStorage.removeItem('resuflow_token');
        localStorage.removeItem('resuflow_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const tokenResponse = await authApi.login(email, password);
      localStorage.setItem('resuflow_token', tokenResponse.access_token);
      setToken(tokenResponse.access_token);

      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('resuflow_user', JSON.stringify(userData));
    } catch (err) {
      // Clear any partial state
      localStorage.removeItem('resuflow_token');
      localStorage.removeItem('resuflow_user');
      setToken(null);
      setUser(null);
      throw err instanceof ApiError ? err : new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authApi.register(email, password);
      // Auto-login after successful registration
      const tokenResponse = await authApi.login(email, password);
      localStorage.setItem('resuflow_token', tokenResponse.access_token);
      setToken(tokenResponse.access_token);

      const userData = await authApi.getMe();
      setUser(userData);
      localStorage.setItem('resuflow_user', JSON.stringify(userData));
    } catch (err) {
      localStorage.removeItem('resuflow_token');
      localStorage.removeItem('resuflow_user');
      setToken(null);
      setUser(null);
      throw err instanceof ApiError ? err : new Error('Registration failed');
    } finally {
      setIsLoading(false);
    }
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
