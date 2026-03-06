"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getProfile, logout as apiLogout } from "@/app/services/api";
import { useRouter, usePathname } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  login: (user: AdminUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuthStatus = useCallback(async () => {
    try {
      const data = await getProfile();
      setUser(data.admin);
      setIsAuthenticated(true);
      
      // Se estiver na tela de login e já autenticado, vai para dashboard
      if (pathname === "/signin") {
        router.push("/");
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      // Se não estiver na tela de login, redireciona
      if (pathname !== "/signin") {
        router.push("/signin");
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback((userData: AdminUser) => {
    setUser(userData);
    setIsAuthenticated(true);
    router.push("/");
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Erro ao fazer logout", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      router.push("/signin");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
