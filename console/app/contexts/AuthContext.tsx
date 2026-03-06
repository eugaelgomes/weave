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
      if (pathname === "/login") {
        router.push("/");
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      // Se não estiver na tela de login, permitir renderizar (o middleware ou componente protegidos cuidam disso)
      // Mas podemos forçar redirect se quisermos ser estritos no client-side também
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
      router.push("/login");
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
