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
        if (profileData.theme_mode) {
          setTheme(profileData.theme_mode);
        }
      } catch (error) {
        // Se falhar (401/403), o usuário não está logado.
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
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
        setUser(response.user);
        if (response.user.theme_mode) setTheme(response.user.theme_mode);

        return { success: true, data: response };
      }
      throw new Error("Resposta de login inválida");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    initiateGoogleLogin();
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
      window.location.href = "/auth/signin";
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
  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedData = await updateUserData(userData);
      setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
      if (updatedData.theme_mode) setTheme(updatedData.theme_mode);
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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
