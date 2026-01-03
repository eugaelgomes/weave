import { jwtDecode } from "jwt-decode";
import { API_ENDPOINTS } from "../api-routes";
import { apiClient, handleResponse } from "../api-methods";

// --- 1. Interfaces (Tipagem) ---

// Interface unificada do Usuário para uso no Frontend (Flat/Achatada)
export interface User {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  birth_date?: string;
  phone_number?: string; // Corrigido para o front (backend envia phone_numer)

  // Dados da Organização
  org_id?: string;
  org_name?: string;
  org_unique_name?: string;

  // Configurações e Preferências (Flattened)
  theme_mode?: string;
  private_profile?: boolean;
  auth_with_google?: boolean;
  
  // Role (geralmente vindo do login ou calculado)
  role?: string;       
}

// Interfaces auxiliares para tipar a resposta do Backend

interface BackendProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
  birth_date?: string;
  phone_numer?: string; // Mantendo o typo do backend aqui para mapear corretamente
}

interface BackendSettings {
  theme_mode?: string;
  private_profile?: boolean;
  auth_with_google?: boolean;
}

interface BackendOrganization {
  id: string;
  unique_name: string;
  name: string;
}

// Resposta do LOGIN (tem status e token)
interface BackendAuthResponse {
  status: string;      
  logged_at?: string;
  message?: string;
  token?: string;
  user_data?: {
    profile: BackendProfile;
    organization: BackendOrganization;
    // Login geralmente não retorna settings, mas se retornar, adicionamos aqui
  };
}

// Resposta do ME/PROFILE (NÃO tem status na raiz, apenas user_data)
interface BackendMeResponse {
  message?: string; // Em caso de erro 404/500
  user_data?: {
    profile: BackendProfile;
    settings: BackendSettings;
    organization: BackendOrganization;
  };
}

export interface LoginCredentials {
  login: string;
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

// --- 2. Utils ---

export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

// --- 3. Autenticação (Login) ---

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, credentials);
  const data = await handleResponse<BackendAuthResponse>(response);

  // Validação baseada na estrutura do Login (com status: "OK")
  if (data.status === "OK" && data.user_data) {
    const user: User = {
      id: data.user_data.profile.id,
      name: data.user_data.profile.name,
      username: data.user_data.profile.username,
      email: data.user_data.profile.email,
      avatar_url: data.user_data.profile.avatar_url,
      created_at: data.user_data.profile.created_at,

      org_id: data.user_data.organization.id,
      org_name: data.user_data.organization.name,
      org_unique_name: data.user_data.organization.unique_name,
    };

    return {
      user,
      token: data.token || "",
    };
  }

  throw new Error(data.message || "Erro desconhecido ao realizar login.");
};

// --- 4. Gerenciamento de Dados do Usuário (/ME) ---

export const getUserData = async (): Promise<User> => {
  const response = await apiClient.get(API_ENDPOINTS.ME);

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    if (response.status === 404) throw new Error("Usuário não encontrado");
    throw new Error("Erro ao buscar dados do usuário");
  }

  // Usamos a interface específica do /ME
  const data = await handleResponse<BackendMeResponse>(response);

  // Verificamos apenas se user_data existe (já que não tem status: OK na raiz)
  if (data.user_data) {
    // Mapeamento completo Backend -> Frontend
    const user: User = {
      // Profile
      id: data.user_data.profile.id,
      name: data.user_data.profile.name,
      username: data.user_data.profile.username,
      email: data.user_data.profile.email,
      avatar_url: data.user_data.profile.avatar_url,
      created_at: data.user_data.profile.created_at,
      updated_at: data.user_data.profile.updated_at,
      birth_date: data.user_data.profile.birth_date,
      // Correção do typo do backend (phone_numer -> phone_number)
      phone_number: data.user_data.profile.phone_numer, 

      // Settings (Achatando para o objeto User)
      theme_mode: data.user_data.settings?.theme_mode,
      private_profile: data.user_data.settings?.private_profile,
      auth_with_google: data.user_data.settings?.auth_with_google,

      // Organization
      org_id: data.user_data.organization.id,
      org_name: data.user_data.organization.name,
      org_unique_name: data.user_data.organization.unique_name,
    };

    return user;
  }

  throw new Error("Formato de resposta do perfil inválido.");
};

// --- 5. Outros Serviços ---

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
  try {
     const json = JSON.parse(text);
     return { message: json.message || text };
  } catch {
     return { message: text };
  }
};

export const logout = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.LOGOUT);
  return await handleResponse<void>(response);
};

export const refreshToken = async (): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.REFRESH);
  // Assumimos que o refresh segue o padrão do login
  const data = await handleResponse<BackendAuthResponse>(response);

  if (data.status === "OK" && data.token) {
      let user: User = {};
      if (data.user_data) {
         user = {
            id: data.user_data.profile.id,
            name: data.user_data.profile.name,
            username: data.user_data.profile.username,
            email: data.user_data.profile.email,
            avatar_url: data.user_data.profile.avatar_url,
            org_id: data.user_data.organization.id,
            org_name: data.user_data.organization.name,
            org_unique_name: data.user_data.organization.unique_name,
         };
      }
      return { user, token: data.token };
  }
  throw new Error("Sessão expirada.");
};

export const initiateGoogleLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  window.location.href = `${baseUrl}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const updateUserData = async (userData: Partial<User>): Promise<Partial<User>> => {
  // Nota: O backend para update pode esperar uma estrutura diferente (ex: aninhada ou plana).
  // Geralmente, envia-se plano e o backend trata.
  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, userData);
  const data = await handleResponse<User>(response);

  // Atualiza apenas o que retornou
  const result: Partial<User> = {};
  if (data.name) result.name = data.name;
  if (data.email) result.email = data.email;
  if (data.username) result.username = data.username;
  if (data.avatar_url) result.avatar_url = data.avatar_url;
  if (data.theme_mode) result.theme_mode = data.theme_mode;
  
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

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get(API_ENDPOINTS.USERS);
  return await handleResponse<User[]>(response);
};

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