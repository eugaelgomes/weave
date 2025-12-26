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
} from "../services/auth-service/AuthService";
import { useTheme } from "./ThemeContext";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
  // login can be called as login(username, password) or login({ username, password, remember? })
  login: (
    usernameOrPayload: string | { username: string; password: string; remember?: boolean },
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const authenticated = !!token;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = getCookie(AUTH_USER_KEY);
        if (u) {
          try {
            const userData = JSON.parse(decodeURIComponent(u));
            setUser(userData);
            setTheme(userData.theme_mode || "light");
          } catch {}
        }

        try {
          const profileData = await getUserDataService();
          setUser(profileData);
          setToken("authenticated");
          setTheme(profileData.theme_mode || "light");
        } catch (error) {
          if (u) {
            deleteCookie(AUTH_USER_KEY);
          }
          setUser(null);
          setToken(null);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type LoginPayload = { username: string; password: string; remember?: boolean };

  const login = async (usernameOrPayload: string | LoginPayload, password?: string) => {
    setLoading(true);
    let username: string;
    let pwd: string;
    let remember = false;
    if (typeof usernameOrPayload === "object") {
      username = usernameOrPayload.username;
      pwd = usernameOrPayload.password;
      remember = !!(usernameOrPayload as LoginPayload).remember;
    } else {
      username = usernameOrPayload;
      pwd = password || "";
    }

    try {
      const response = await loginService({ username, password: pwd });

      // Backend retorna user_data: { profile, organization }
      const responseData = response as unknown as {
        user_data?: { profile: User; organization: { id: string; name: string; unique_name: string } };
        user?: User;
        token?: string;
      };

      const userData = responseData.user_data?.profile || responseData.user;

      if (responseData && userData) {
        const t = responseData.token || null;
        // backend já envia cookie HttpOnly com o token; não gravamos token manualmente
        if (t) {
          setToken("authenticated"); // dummy token para indicar estado autenticado
        }
        
        // Adiciona dados da organização ao userData
        if (responseData.user_data?.organization) {
          userData.org_id = responseData.user_data.organization.id;
          userData.org_name = responseData.user_data.organization.name;
          userData.org_unique_name = responseData.user_data.organization.unique_name;
        }
        
        setUser(userData);
        setTheme(userData.theme_mode || "light");
        try {
          setCookie(
            AUTH_USER_KEY,
            encodeURIComponent(JSON.stringify(userData)),
            remember ? 30 : undefined
          );
        } catch {}
        setLoading(false);
        // Return success without navigation
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
      const updatedData = await updateUserData(userData);
      setUser((prev) => ({ ...prev, ...updatedData }));
      if (updatedData.theme_mode) {
        setTheme(updatedData.theme_mode);
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
