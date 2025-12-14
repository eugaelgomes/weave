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

  // Tipagem da resposta
  const data = await handleResponse<{
    success?: boolean;
    data?: LoginResponse;
    user?: User;
    token?: string;
  }>(response);

  if (data.success && data.data) {
    return data.data;
  }

  return data as LoginResponse;
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

export const updateUserData = async (userData: Partial<User>): Promise<User> => {
  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, userData);
  const data = await handleResponse<User>(response);

  return {
    name: data.name,
    email: data.email,
    username: data.username,
    avatar_url: data.avatar_url,
    role: data.role_name,
  };
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
