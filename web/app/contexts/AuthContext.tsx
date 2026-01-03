"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginService,
  logout as logoutService,
  getUserData as getUserDataService,
  createUserService,
  updateUserData,
  updatePassword,
  requestPasswordRecovery,
  resetPassword,
  deleteUser,
  initiateGoogleLogin,
  type User,
  type CreateUserData,
} from "../services/authentication/AuthService";
import { useTheme } from "./ThemeContext";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
  login: (
    usernameOrPayload: string | { login: string; password: string },
    password?: string
  ) => Promise<{ success: boolean; message?: string; data?: unknown }>;
  loginWithGoogle: () => void;
  logout: () => void;
  createUser: (
    userData: CreateUserData | FormData
  ) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetSenha: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  deleteUserPermanently: () => Promise<{ success: boolean; message?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = "codaweb_user";

// --- Helpers de Cookie ---
function setCookie(name: string, value: string, days?: number) {
  if (typeof document === "undefined") return;
  let cookie = `${name}=${encodeURIComponent(value)}; path=/;`;
  if (days && days > 0) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    cookie += ` expires=${expires};`;
  }
  if (typeof window !== "undefined" && window.location.protocol === "https:") cookie += " Secure;";
  cookie += " SameSite=Lax;";
  document.cookie = cookie;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}

// --- Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const authenticated = !!token;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Tenta recuperar usuário do Cookie (para UI instantânea)
        const u = getCookie(AUTH_USER_KEY);
        if (u) {
          try {
            const userData = JSON.parse(decodeURIComponent(u));
            setUser(userData);
            if (userData.theme_mode) setTheme(userData.theme_mode);
          } catch {}
        }

        // 2. Valida sessão com o Backend
        try {
          // O service getUserData agora já retorna o objeto User 'achatado' e pronto
          const profileData = await getUserDataService();

          setUser(profileData);
          setToken("authenticated"); // Ou use um token real se tiver acesso a ele via cookie http-only

          if (profileData.theme_mode) {
            setTheme(profileData.theme_mode);
          }

          // Atualiza o cookie local com os dados mais recentes
          setCookie(AUTH_USER_KEY, JSON.stringify(profileData));
        } catch (error) {
          // Se falhar (401/403), limpa tudo
          if (u) deleteCookie(AUTH_USER_KEY);
          setUser(null);
          setToken(null);
        }
      } catch {
        // Erros gerais
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type LoginPayload = { login: string; password: string; remember?: boolean };

  const login = async (usernameOrPayload: string | LoginPayload, password?: string) => {
    setLoading(true);
    let login: string;
    let pwd: string;

    if (typeof usernameOrPayload === "object") {
      login = usernameOrPayload.login;
      pwd = usernameOrPayload.password;
    } else {
      login = usernameOrPayload;
      pwd = password || "";
    }

    try {
      // O loginService agora retorna { user: User, token: string }
      // Já processado e limpo. Não precisamos de 'as unknown' nem parsing manual.
      const response = await loginService({ login, password: pwd });

      if (response && response.user) {
        const userData = response.user;
        const authToken = response.token;

        setToken(authToken || "authenticated");
        setUser(userData);

        if (userData.theme_mode) {
          setTheme(userData.theme_mode);
        }

        setLoading(false);
        return { success: true, data: response };
      } else {
        throw new Error("Resposta de login inválida");
      }
    } catch (err: unknown) {
      setLoading(false);
      function extractMessage(e: unknown): string | undefined {
        if (typeof e === "object" && e !== null && "message" in e) {
          return (e as { message: string }).message;
        }
        return undefined;
      }
      const message = extractMessage(err) || "Erro de conexão";
      return { success: false, message };
    }
  };

  const loginWithGoogle = () => {
    initiateGoogleLogin();
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setTheme("light");
    try {
      await logoutService();
      deleteCookie(AUTH_USER_KEY);
    } catch {}
    // Redirecionamento forçado para garantir limpeza de estado
    window.location.href = "/auth/signin";
  };

  const createUser = async (userData: CreateUserData | FormData) => {
    try {
      const { message } = await createUserService(userData);
      return { success: true, message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      // O service retorna os campos atualizados
      const updatedData = await updateUserData(userData);

      // Atualizamos o estado local mesclando o anterior com o novo
      setUser((prev) => {
        if (!prev) return null;
        const newUserState = { ...prev, ...updatedData };

        // Atualiza o cookie para persistir a mudança no reload
        setCookie(AUTH_USER_KEY, JSON.stringify(newUserState));

        return newUserState;
      });

      if (updatedData.theme_mode) {
        setTheme(updatedData.theme_mode);
      }
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    try {
      await updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const recoverPassword = async (email: string) => {
    try {
      const data = await requestPasswordRecovery(email);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const resetSenha = async (token: string, password: string) => {
    try {
      const data = await resetPassword(token, password);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const deleteUserPermanently = async () => {
    try {
      await deleteUser();
      await logout(); // Logout automático após deletar
      return { success: true };
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authenticated,
        login,
        loginWithGoogle,
        logout,
        createUser,
        updateUser,
        updateUserPassword,
        recoverPassword,
        resetSenha,
        deleteUserPermanently,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
