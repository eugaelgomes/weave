import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createUserService,
  login as loginService,
  logout as logoutService,
  getUserData as getUserDataService,
  updateUserData,
  requestPasswordRecovery,
  resetPassword,
  updatePassword,
  initiateGoogleLogin,
  initiateGithubLogin,
  deleteUser,
  type User,
  type LoginCredentials,
  type CreateUserData,
} from "./auth-service";

export interface AuthState {
  authenticated: boolean;
  loading: boolean;
  user: User | null;
  users: User[];
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<{ success: boolean; message?: string }>;
  createUser: (userData: CreateUserData) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (
    token: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  getUserData: () => Promise<{ success: boolean; data?: User; message?: string }>;
  loginWithGoogle: () => void;
  loginWithGithub: () => void;
  deleteUserPermanently: () => Promise<{ success: boolean; message?: string }>;
}

export function useAuthProvider(): AuthState & AuthActions {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const router = useRouter();

  // --- Helpers ---

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAuthenticated(false);
    setUsers([]);
  }, []);

  const handleAuthError = (error: unknown): string => {
    return error instanceof Error ? error.message : "Unknown error occurred";
  };

  // --- Efeitos ---

  useEffect(() => {
    async function initializeAuth() {
      try {
        // Verifica retorno do Google OAuth via URL
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const authStatus = urlParams.get("auth");
          const authError = urlParams.get("error");

          if (authStatus === "success" || authError) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }

          if (authError === "auth_failed") {
            console.error("OAuth authentication failed");
          }
        }

        const userData = await getUserDataService();

        if (userData) {
          setUser(userData);
          setAuthenticated(true);
        } else {
          throw new Error("User data not found");
        }
      } catch (error) {
        clearAuthState();
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();
  }, [clearAuthState]);

  // --- Ações de Autenticação ---

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await loginService(credentials);

      if (response && response.user) {
        setUser(response.user);
        setAuthenticated(true);
        return { success: true };
      }

      throw new Error("Invalid login response");
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, message: handleAuthError(error) };
    }
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthState();
      router.push("/auth/");
      return { success: true };
    }
  };

  const createUser = async (userData: CreateUserData) => {
    try {
      const { message } = await createUserService(userData);
      return { success: true, message };
    } catch (error) {
      return { success: false, message: handleAuthError(error) };
    }
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      const updatedData = await updateUserData(userData);
      setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
      return { success: true };
    } catch (error) {
      console.error("Update user failed:", error);
      return { success: false, message: handleAuthError(error) };
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    try {
      await updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Update password failed:", error);
      return { success: false, message: handleAuthError(error) };
    }
  };

  const recoverPassword = async (email: string) => {
    try {
      const data = await requestPasswordRecovery(email);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: handleAuthError(error) };
    }
  };

  const handleResetPassword = async (token: string, password: string) => {
    try {
      const data = await resetPassword(token, password);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: handleAuthError(error) };
    }
  };

  const getCurrentUser = async () => {
    try {
      const data = await getUserDataService();
      return { success: true, data };
    } catch (error) {
      return { success: false, message: handleAuthError(error) };
    }
  };

  const loginWithGoogle = () => {
    initiateGoogleLogin();
  };

  const loginWithGithub = () => {
    initiateGithubLogin();
  };

  const deleteUserPermanently = async () => {
    try {
      await deleteUser();
      return { success: true };
    } catch (error) {
      console.error("Delete user failed:", error);
      return { success: false, message: handleAuthError(error) };
    }
  };

  return {
    authenticated,
    loading,
    user,
    users,
    login,
    logout,
    createUser,
    updateUser: updateUserProfile,
    updateUserPassword,
    recoverPassword,
    resetPassword: handleResetPassword,
    getUserData: getCurrentUser,
    loginWithGoogle,
    loginWithGithub,
    deleteUserPermanently,
  };
}
