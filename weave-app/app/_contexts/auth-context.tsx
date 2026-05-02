"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  login as loginService,
  logout as logoutService,
  getUserData as getUserDataService,
  createUserService,
  activateAccountService,
  updateUserData,
  updatePassword,
  requestPasswordRecovery,
  resetPassword,
  deleteUser,
  initiateGoogleLogin,
  initiateGithubLogin,
  initiateMicrosoftLogin,
  type User,
  type CreateUserData,
  type ActivateAccountPayload,
} from "../_services/authentication/auth-service";
import { useTheme } from "./theme-context";

/** Consumer-facing user model — import from this module in UI; do not import auth-service types directly. */
export type { User };

const toUiThemeMode = (themeMode?: string | null): "light" | "dark" | null => {
  if (!themeMode) return null;
  const normalized = themeMode.toUpperCase();
  if (normalized === "LIGHT") return "light";
  if (normalized === "DARK") return "dark";
  return null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;

  // Auth Functions
  login: (
    usernameOrPayload: string | { login: string; password: string },
    password?: string
  ) => Promise<{ success: boolean; message?: string; data?: any }>;
  loginWithGoogle: () => void;
  loginWithGithub: () => void;
  loginWithMicrosoft: () => void;
  logout: () => void;

  // User Profile
  createUser: (
    userData: CreateUserData | FormData
  ) => Promise<{ success: boolean; message?: string }>;
  activateAccount: (
    payload: ActivateAccountPayload
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const authenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // A validação de sessão ocorre automaticamente aqui.
        // Se o cookie HttpOnly for inválido ou expirado, o backend retornará 401.
        const profileData = await getUserDataService();

        setUser(profileData);

        const profileThemeMode = toUiThemeMode(profileData.theme_mode);
        if (profileThemeMode) {
          setTheme(profileThemeMode);
        }
      } catch (error) {
        // Se falhar (401/403), o usuário não está logado - ignora o erro silenciosamente
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Só verifica autenticação se não estiver em páginas públicas
    const publicPaths = ["/auth", "/auth/", "/auth/signup", "/auth/reset-password"];
    const isPublicPath = publicPaths.some((path) => window.location.pathname.startsWith(path));

    if (isPublicPath) {
      // Em páginas públicas, não verifica autenticação automaticamente
      setLoading(false);
    } else {
      // Em páginas privadas, verifica se há sessão válida
      checkAuth();
    }
  }, [setTheme]);

  type LoginPayload = { login: string; password: string; remember?: boolean };

  const login = async (
    usernameOrPayload: string | { login: string; password: string },
    password?: string
  ) => {
    setLoading(true);
    let loginValue: string;
    let pwd: string;

    if (typeof usernameOrPayload === "object") {
      loginValue = usernameOrPayload.login;
      pwd = usernameOrPayload.password;
    } else {
      loginValue = usernameOrPayload;
      pwd = password || "";
    }

    try {
      const response = await loginService({ login: loginValue, password: pwd });

      if (response && response.user) {
        // Após login bem-sucedido, busca dados completos do usuário
        try {
          const fullUserData = await getUserDataService();
          setUser(fullUserData);
          const fullUserThemeMode = toUiThemeMode(fullUserData.theme_mode);
          if (fullUserThemeMode) {
            setTheme(fullUserThemeMode);
          }
        } catch {
          // Se falhar ao buscar dados completos, usa o que veio do login
          setUser(response.user);
          const responseUserThemeMode = toUiThemeMode(response.user.theme_mode);
          if (responseUserThemeMode) {
            setTheme(responseUserThemeMode);
          }
        }

        return { success: true, data: response };
      }
      throw new Error("Resposta de login inválida");
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Erro de conexão";
      const errorData = err?.data ? err.data : null;
      return { success: false, message, data: errorData };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    initiateGoogleLogin();
  };

  const loginWithGithub = () => {
    initiateGithubLogin();
  };

  const loginWithMicrosoft = () => {
    initiateMicrosoftLogin();
  };

  const logout = async () => {
    try {
      // O logout avisa o backend para invalidar a sessão e limpar o cookie (Set-Cookie: expires=1970)
      await logoutService();
    } catch (error) {
      console.error("Erro ao notificar logout no servidor", error);
    } finally {
      // Limpa estado local independentemente do sucesso da chamada de rede
      setUser(null);
      setTheme("light");
      window.location.href = "/auth/";
    }
  };

  const createUser = async (userData: CreateUserData | FormData) => {
    try {
      const { message } = await createUserService(userData);
      return { success: true, message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const activateAccount = async (payload: ActivateAccountPayload) => {
    try {
      const { message } = await activateAccountService(payload);
      return { success: true, message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedData = await updateUserData(userData);

      // Remove campos undefined para não sobrescrever dados existentes
      const cleanedData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, value]) => value !== undefined)
      ) as Partial<User>;

      setUser((prev) => (prev ? { ...prev, ...cleanedData } : null));
      const updatedThemeMode = toUiThemeMode(updatedData.theme_mode);
      if (updatedThemeMode) {
        setTheme(updatedThemeMode);
      }
      return { success: true };
    } catch (error) {
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
        loading,
        authenticated,
        login,
        loginWithGoogle,
        loginWithGithub,
        loginWithMicrosoft,
        logout,
        createUser,
        activateAccount,
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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
