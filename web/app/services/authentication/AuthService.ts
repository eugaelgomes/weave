import { jwtDecode } from "jwt-decode";
import { API_ENDPOINTS } from "../api-routes";
import { apiClient, handleResponse } from "../api-methods";

// --- 1. Interfaces de Domínio (Frontend) ---

export interface PlanDetails {
  limits?: {
    max_notes?: number;
    max_projects?: number;
    max_team_members?: number;
    exports?: {
      notes_monthly?: number;
      backups_monthly?: number;
    };
    storage?: {
      retention_days?: number | null;
      max_file_size_mb?: number;
      total_monthly_upload_mb?: number;
    };
  };
  features?: {
    dark_mode?: boolean;
    custom_branding?: boolean;
    priority_support?: boolean;
    collaboration_tools?: boolean;
    [key: string]: boolean | undefined;
  };
  metadata?: {
    version?: string;
    plan_tier?: string;
    is_trial_available?: boolean;
  };
  weave_ai?: {
    enabled?: boolean;
    features?: string[];
    config?: {
      default_model?: string;
      available_models?: string[];
      monthly_messages?: number;
      max_tokens_per_message?: number;
      context_window_messages?: number;
    };
  };
}

export interface User {
  id?: string;
  username?: string;
  user_name?: string;
  email?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  birth_date?: string;
  phone_number?: string;

  org_id?: string;
  org_name?: string;
  org_unique_name?: string;
  org_logo_url?: string;
  org_member_role?: string | string[] | null;
  org_member_since?: string;

  theme_mode?: string;
  private_profile?: boolean;
  auth_with_google?: boolean;

  // Plan information
  plan_id?: string;
  plan_name?: string;
  plan_client_type?: string;
  plan_details?: PlanDetails;

  // Plan usage information
  usage_plan_id?: string;
  usage_plan_name?: string;
  usage_client_type?: string;
  usage_period_start?: string;
  usage_period_end?: string;
  usage_details?: Record<string, unknown>;
}

// --- 2. Interfaces DTO (Backend Response Contracts) ---

interface BackendProfile {
  id: string;
  user_name: string;
  username: string;
  email: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
  birth_date?: string;
  phone_number?: string;
}

interface BackendSettings {
  theme_mode?: string;
  private_profile?: boolean;
  auth_with_google?: boolean;
}

interface BackendOrganization {
  id: string;
  unique_name: string;
  org_name: string;
  org_logo_url?: string;
  org_member_role?: string | string[] | null;
  org_member_since?: string;
}

interface BackendPlan {
  id: string;
  plan_name: string;
  client_type: string;
  details: Record<string, unknown>;
}

interface BackendPlanUsage {
  plan_id: string;
  plan_name: string;
  client_type: string;
  period_start: string;
  period_end: string;
  details: Record<string, unknown>;
}

// Interface unificada dos dados que vêm dentro de 'user_data'
interface BackendUserData {
  profile: BackendProfile;
  settings?: BackendSettings;
  organization?: BackendOrganization;
  current_plan?: BackendPlan;
  current_plan_usage?: BackendPlanUsage;
}

interface BackendAuthResponse {
  status: string;
  logged_at?: string;
  message?: string;
  token?: string;
  user_data?: BackendUserData;
}

interface BackendMeResponse {
  message?: string;
  user_data?: BackendUserData;
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
  user_name?: string;
}

// --- 3. Helpers & Mappers (Adapter Pattern) ---

export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

/**
 * Single Source of Truth para converter dados do Backend para o Modelo de Usuário do Frontend.
 * Aceita estruturas parciais (ex: updateProfile pode não retornar organization).
 */
const mapBackendDataToUser = (data: BackendUserData): User => {
  const { profile, settings, organization, current_plan, current_plan_usage } = data;

  return {
    // Profile
    id: profile.id,
    user_name: profile.user_name,
    username: profile.username,
    email: profile.email,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    birth_date: profile.birth_date,
    phone_number: profile.phone_number,

    // Settings
    theme_mode: settings?.theme_mode,
    private_profile: settings?.private_profile,
    auth_with_google: settings?.auth_with_google,

    // Organization (Optional)
    org_id: organization?.id,
    org_name: organization?.org_name,
    org_unique_name: organization?.unique_name,
    org_logo_url: organization?.org_logo_url,
    org_member_role: organization?.org_member_role,
    org_member_since: organization?.org_member_since,

    // Plan (Optional)
    plan_id: current_plan?.id,
    plan_name: current_plan?.plan_name,
    plan_client_type: current_plan?.client_type,
    plan_details: current_plan?.details,

    // Usage (Optional)
    usage_plan_id: current_plan_usage?.plan_id,
    usage_plan_name: current_plan_usage?.plan_name,
    usage_client_type: current_plan_usage?.client_type,
    usage_period_start: current_plan_usage?.period_start,
    usage_period_end: current_plan_usage?.period_end,
    usage_details: current_plan_usage?.details,
  };
};

// --- 4. Serviços de Autenticação ---

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, credentials);
  const data = await handleResponse<BackendAuthResponse>(response);

  if (data.status === "OK" && data.user_data) {
    return {
      user: mapBackendDataToUser(data.user_data), // Reuso limpo
      token: data.token || "",
    };
  }

  throw new Error(data.message || "Erro desconhecido ao realizar login.");
};

export const getUserData = async (): Promise<User> => {
  const response = await apiClient.get(API_ENDPOINTS.ME);

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    if (response.status === 404) throw new Error("Usuário não encontrado");
    throw new Error("Erro ao buscar dados do usuário");
  }

  const data = await handleResponse<BackendMeResponse>(response);

  if (data.user_data) {
    return mapBackendDataToUser(data.user_data); // Reuso limpo
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
    // Lógica de extração de erro mantida...
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

export const initiateGoogleLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  window.location.href = `${baseUrl}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const updateUserData = async (userData: Partial<User>): Promise<Partial<User>> => {
  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, userData);

  interface UpdateProfileResponse {
    user_data: {
      profile: BackendProfile;
      settings: BackendSettings;
      // Note que aqui organization e plan podem não vir, e o mapper lida bem com isso
    };
    message: string;
    email_validation?: {
      pending: boolean;
      pending_email: string;
    };
  }

  const data = await handleResponse<UpdateProfileResponse>(response);

  // O mapper converte o que veio. Como org e plan são undefined na resposta do update,
  // eles serão undefined no objeto retornado, o que é compatível com Partial<User>
  return mapBackendDataToUser(data.user_data);
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
