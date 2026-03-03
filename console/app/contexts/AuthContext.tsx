"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { checkAuth } from "@/app/services/api";
import { APP_URL } from "@/app/config/urls";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth()
      .then((ok) => {
        setIsAuthenticated(ok);
        if (!ok) {
          // Redirecionar para login do app principal
          window.location.href = `${APP_URL}/auth/signin`;
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    window.location.href = `${APP_URL}/auth/signin`;
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
