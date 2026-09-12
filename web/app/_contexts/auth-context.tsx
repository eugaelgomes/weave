"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  login as loginService,
  loginWithCode as loginWithCodeService,
  logout as logoutService,
  getUserData as getUserDataService,
  createUserService,
  activateAccountService,
  requestLoginCode as requestLoginCodeService,
  discoverSamlSso as discoverSamlSsoService,
  startSamlSsoLogin as startSamlSsoLoginService,
  updateUserData,
  updatePassword,
  type UserUniqueField,
  type UserFieldAvailability,
  requestPasswordRecovery,
  resetPassword,
  deleteUser,
  initiateGoogleLogin,
  initiateGithubLogin,
  initiateMicrosoftLogin,
  type User,
  type CreateUserData,
  type ActivateAccountPayload,
  type LoginResponse,
  type SamlSsoDiscoverResponse,
  getAuthProvidersService,
  type AuthProvidersConfig,
} from "../_services/authentication/auth-service";
import { setUnauthorizedHandler } from "../_services/session-invalidation";
import { ApiError } from "../_services/api-error";
import { mergeUsageDetails } from "../_services/plans-service/plan-usage-service";
import { logClientError } from "../_utils/client-logger";
import { useTheme } from "./theme-context";
import { switchOrganizationApi } from "../_services/organization";

/** Consumer-facing user model — import from this module in UI; do not import auth-service types directly. */
export type { User };

const toUiThemeMode = (themeMode?: string | null): "light" | "dark" | null => {
  if (!themeMode) return null;
  const normalized = themeMode.toUpperCase();
  if (normalized === "LIGHT") return "light";
  if (normalized === "DARK") return "dark";
  return null;
};

type LoginResult =
  { success: true; data: LoginResponse } | { success: false; message: string; data?: unknown };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;

  /** Reload profile from `GET /users/me` (e.g. after org or role changes). */
  refreshUser: () => Promise<User | null>;

  /** Deep-merge plan/usage fields (e.g. from `GET /plans/me`) without refetching full profile. */
  mergeUser: (patch: Partial<User> | ((prev: User) => Partial<User>)) => void;

  // Auth Functions
  login: (
    usernameOrPayload: string | { login: string; password: string },
    password?: string
  ) => Promise<LoginResult>;
  requestLoginCode: (login: string) => Promise<{ success: boolean; message?: string }>;
  loginWithCode: (payload: { login: string; code: string }) => Promise<LoginResult>;
  discoverSamlSso: (email: string) => Promise<SamlSsoDiscoverResponse>;
  startSamlSsoLogin: (organizationId: string) => void;
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
  updateUser: (userData: Partial<User>) => Promise<{
    success: boolean;
    message?: string;
    conflicts?: Partial<Record<UserUniqueField, UserFieldAvailability>>;
  }>;
  updateUserPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetSenha: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  deleteUserPermanently: () => Promise<{ success: boolean; message?: string }>;
  switchOrganization: (organizationId: string) => Promise<{ success: boolean; message?: string }>;

  // Providers Configuration
  providers: AuthProvidersConfig | null;
  providersLoading: boolean;
  isProviderEnabled: (
    provider: "google" | "github" | "microsoft" | "saml" | "code" | "credentials"
  ) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AuthProvidersConfig | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const { setTheme } = useTheme();

  const authenticated = !!user;

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const profileData = await getUserDataService();
      setUser(profileData);
      const profileThemeMode = toUiThemeMode(profileData.theme_mode);
      if (profileThemeMode) {
        setTheme(profileThemeMode);
      }
      return profileData;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      logClientError("auth.refreshUser", error);
      return user;
    }
  }, [setTheme, user]);

  const mergeUser = useCallback((patch: Partial<User> | ((prev: User) => Partial<User>)) => {
    setUser((prev) => {
      if (!prev) return null;
      const resolved = typeof patch === "function" ? patch(prev) : patch;
      const { usage_details: usagePatch, ...rest } = resolved;
      const next: User = { ...prev, ...rest };
      if (usagePatch) {
        next.usage_details = prev.usage_details
          ? mergeUsageDetails(prev.usage_details, usagePatch)
          : usagePatch;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadProviders = async () => {
      try {
        const data = await getAuthProvidersService();
        if (isMounted) {
          setProviders(data);
        }
      } catch (error) {
        logClientError("auth.loadProviders", error);
      } finally {
        if (isMounted) {
          setProvidersLoading(false);
        }
      }
    };
    loadProviders();
    return () => {
      isMounted = false;
    };
  }, []);

  const isProviderEnabled = useCallback(
    (provider: "google" | "github" | "microsoft" | "saml" | "code" | "credentials"): boolean => {
      if (provider === "credentials") return true;
      if (!providers) return false;
      if (provider === "saml") return Boolean(providers.saml);
      if (provider === "code") return Boolean(providers.code);
      return Boolean(providers.oauth?.includes(provider));
    },
    [providers]
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setTheme("light");
      if (typeof window === "undefined") return;
      const path = window.location.pathname;
      const isPublic = path.startsWith("/auth") || path.startsWith("/activate");
      if (isPublic) return;
      window.location.href = "/auth/";
    });
    return () => setUnauthorizedHandler(null);
  }, [setTheme]);

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const isOauthSuccessReturn = params.get("auth") === "success";
      const maxAttempts = isOauthSuccessReturn ? 5 : 1;

      try {
        let profileData: User | null = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            // A validação de sessão ocorre automaticamente aqui.
            // Se o cookie HttpOnly for inválido ou expirado, o backend retornará 401.
            profileData = await getUserDataService();
            break;
          } catch (error) {
            if (attempt === maxAttempts) {
              throw error;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 250));
          }
        }

        if (!profileData) {
          throw new Error("Unable to load authenticated profile");
        }
        setUser(profileData);

        const profileThemeMode = toUiThemeMode(profileData.theme_mode);
        if (profileThemeMode) {
          setTheme(profileThemeMode);
        }
      } catch {
        // Se falhar (401/403), o usuário não está logado - ignora o erro silenciosamente
        setUser(null);
      } finally {
        if (typeof window !== "undefined") {
          const p = new URLSearchParams(window.location.search);
          if (p.has("auth") || p.has("error")) {
            p.delete("auth");
            p.delete("error");
            const qs = p.toString();
            const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
            window.history.replaceState({}, document.title, next);
          }
        }
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

        return { success: true as const, data: response };
      }
      throw new Error("Resposta de login inválida");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão";
      const errorData = err instanceof ApiError ? err.data : undefined;
      return { success: false as const, message, data: errorData };
    } finally {
      setLoading(false);
    }
  };

  const requestLoginCode = async (login: string) => {
    try {
      const data = await requestLoginCodeService({ login });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const loginWithCode = async (payload: { login: string; code: string }) => {
    setLoading(true);

    try {
      const response = await loginWithCodeService(payload);

      if (response && response.user) {
        try {
          const fullUserData = await getUserDataService();
          setUser(fullUserData);
          const fullUserThemeMode = toUiThemeMode(fullUserData.theme_mode);
          if (fullUserThemeMode) {
            setTheme(fullUserThemeMode);
          }
        } catch {
          setUser(response.user);
          const responseUserThemeMode = toUiThemeMode(response.user.theme_mode);
          if (responseUserThemeMode) {
            setTheme(responseUserThemeMode);
          }
        }

        return { success: true as const, data: response };
      }

      throw new Error("Resposta de login inválida");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão";
      const errorData = err instanceof ApiError ? err.data : undefined;
      return { success: false as const, message, data: errorData };
    } finally {
      setLoading(false);
    }
  };

  const discoverSamlSso = async (email: string) => {
    try {
      return await discoverSamlSsoService({ email });
    } catch (error) {
      logClientError("auth.discoverSamlSso", error);
      return {
        success: false,
        requires_sso: false,
      };
    }
  };

  const startSamlSsoLogin = (organizationId: string) => {
    startSamlSsoLoginService(organizationId);
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
      logClientError("auth.logout", error);
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
      let conflicts: Partial<Record<UserUniqueField, UserFieldAvailability>> | undefined;

      if (error instanceof ApiError && error.data && typeof error.data === "object") {
        const data = error.data as {
          code?: unknown;
          conflicts?: unknown;
        };

        if (data.code === "USER_UNIQUE_CONFLICT" && data.conflicts) {
          const rawConflicts = data.conflicts as Record<string, UserFieldAvailability>;
          conflicts = {};
          if (rawConflicts.email) conflicts.email = rawConflicts.email;
          if (rawConflicts.username) conflicts.username = rawConflicts.username;
          if (rawConflicts.phone_number) conflicts.phone_number = rawConflicts.phone_number;
        }
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        conflicts,
      };
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    try {
      await updatePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      logClientError("auth.updatePassword", error);
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
      logClientError("auth.deleteUser", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const switchOrganization = async (organizationId: string) => {
    try {
      const ok = await switchOrganizationApi(organizationId);
      if (ok) {
        const freshUser = await refreshUser();
        if (freshUser?.user_organization?.public_id) {
          window.location.href = `/${freshUser.user_organization.public_id}/new`;
        } else if (freshUser?.user_organization?.unique_name) {
          window.location.href = `/${freshUser.user_organization.unique_name}/new`;
        } else {
          window.location.href = "/";
        }
        return { success: true };
      }
      return { success: false, message: "Failed to switch organization" };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated,
        refreshUser,
        mergeUser,
        login,
        requestLoginCode,
        loginWithCode,
        discoverSamlSso,
        startSamlSsoLogin,
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
        switchOrganization,
        providers,
        providersLoading,
        isProviderEnabled,
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
