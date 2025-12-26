import { jwtDecode } from "jwt-decode";
import { API_ENDPOINTS } from "../api-routes";
import { apiClient, handleResponse } from "../api-methods";

// Tipos
export interface User {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  role_name?: string;
  theme_mode?: "light" | "dark";
  org_id?: string;
  org_name?: string;
  org_unique_name?: string;
  [key: string]: unknown;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  name?: string;
}

// Utils
export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

// Autenticação
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, credentials);

  // Tipagem da resposta do backend
  const data = await handleResponse<{
    success?: boolean;
    user_data?: {
      profile: User;
      organization: {
        id: string;
        name: string;
        unique_name: string;
      };
    };
    token?: string;
    message?: string;
  }>(response);

  if (data.success && data.user_data) {
    // Mescla os dados da organização no objeto do usuário
    const user: User = {
      ...data.user_data.profile,
      org_id: data.user_data.organization.id,
      org_name: data.user_data.organization.name,
      org_unique_name: data.user_data.organization.unique_name,
    };

    return {
      user,
      token: data.token || "",
    };
  }

  throw new Error(data.message || "Erro ao fazer login");
};

export const createUserService = async (
  userData: CreateUserData | FormData
): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.CREATE_ACCOUNT, userData);

  if (!response.ok) {
    const text = await response.text();
    let errorMessage = "Falha ao criar usuário";

    try {
      const errorJson = JSON.parse(text);
      if (errorJson.errors && Array.isArray(errorJson.errors)) {
        errorMessage = errorJson.errors[0].msg || errorJson.errors[0].message || errorMessage;
      } else {
        errorMessage = errorJson.message || errorMessage;
      }
    } catch {
      errorMessage = text || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const text = await response.text();
  return { message: text };
};

export const logout = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.LOGOUT);
  return await handleResponse<void>(response);
};

export const refreshToken = async (): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.REFRESH);
  return await handleResponse<LoginResponse>(response);
};

export const initiateGoogleLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  window.location.href = `${baseUrl}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const getUserData = async (): Promise<User> => {
  const response = await apiClient.get(API_ENDPOINTS.ME);

  if (!response.ok && response.status === 401) {
    throw new Error("Unauthorized");
  }

  return await handleResponse<User>(response);
};

export const updateUserData = async (userData: Partial<User>): Promise<Partial<User>> => {
  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, userData);
  const data = await handleResponse<User>(response);

  // Retorna apenas os campos que vieram do backend para não sobrescrever dados existentes
  const result: Partial<User> = {};

  if (data.name !== undefined) result.name = data.name;
  if (data.email !== undefined) result.email = data.email;
  if (data.username !== undefined) result.username = data.username;
  if (data.avatar_url !== undefined) result.avatar_url = data.avatar_url;
  if (data.role_name !== undefined) result.role = data.role_name;
  if (data.theme_mode !== undefined) result.theme_mode = data.theme_mode;
  if (data.org_id !== undefined) result.org_id = data.org_id;
  if (data.org_name !== undefined) result.org_name = data.org_name;
  if (data.org_unique_name !== undefined) result.org_unique_name = data.org_unique_name;

  return result;
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PASSWORD, {
    currentPassword,
    newPassword,
  });
  return await handleResponse<void>(response);
};

export const deleteUser = async (): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.DELETE_ACCOUNT);
  return await handleResponse<void>(response);
};

// Endpoints para dados usuários
export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get(API_ENDPOINTS.USERS);
  return await handleResponse<User[]>(response);
};

// Recuperação de Senha
export const requestPasswordRecovery = async (email: string): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
  return await handleResponse<{ message: string }>(response);
};

export const resetPassword = async (
  token: string,
  password: string
): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, {
    token,
    password,
  });
  return await handleResponse<{ message: string }>(response);
};
