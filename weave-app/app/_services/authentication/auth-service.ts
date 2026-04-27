import { jwtDecode } from "jwt-decode";
import { API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import type { UserPreferences } from "@/types/user-preferences";
import getStorageUrl from "@/app/_utils/get-storage-url";

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

export interface UsageDetails {
  monthly_cycle?: {
    exports?: {
      notes_count?: number;
      backups_count?: number;
    };
    storage?: {
      files_count?: number;
      total_uploaded_mb?: number;
    };
    weave_ai?: {
      messages_sent?: number;
      tokens_estimated?: number;
    };
    current_period_end?: string;
    current_period_start?: string;
  };
  usage_summary?: {
    notes_total?: number;
    projects_total?: number;
    team_members_total?: number;
  };
  history_metadata?: {
    last_activity_at?: string;
    usage_percentage_total?: number;
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
  logo_url?: string;
  org_member_since?: string;

  theme_mode?: string;
  private_profile?: boolean;
  auth_with_google?: boolean;
  auth_with_github?: boolean;
  auth_with_microsoft?: boolean;

  // App preferences
  usage_preference?: UserPreferences;

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
  usage_details?: UsageDetails;
}

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
  usage_preference?: Record<string, unknown>;
}

interface BackendOrganization {
  id: string;
  unique_name: string;
  org_name: string;
  org_logo_url?: string;
  org_member_role?: string | string[] | null;
  logo_url?: string;
  org_member_since?: string;
}

interface BackendPlan {
  id: string;
  plan_name: string;
  client_type: string;
  details: any;
}

interface BackendPlanUsage {
  plan_id: string;
  plan_name: string;
  client_type: string;
  period_start: string;
  period_end: string;
  details: any;
}

// Interface unificada dos dados que vêm dentro de 'user_data'
interface BackendUserData {
  profile: BackendProfile;
  settings?: BackendSettings;
  organization?: BackendOrganization;
  current_plan?: BackendPlan;
  current_plan_usage?: BackendPlanUsage;
  usage_preference?: Record<string, unknown>;
}

// Interfaces específicas para a resposta de login
interface BackendLoginUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
}

interface BackendLoginUserSettings {
  theme_mode?: string;
  private_profile?: boolean;
}

interface BackendLoginUserOrganization {
  id: string;
  unique_name: string;
  name: string;
  role?: string | string[] | null;
  logo_url?: string;
}

interface BackendLoginUserSubscription {
  plan_id: string;
  plan_name: string;
}

interface BackendAuthResponse {
  status: string;
  message?: string;
  user: {
    user_profile: BackendLoginUserProfile;
    user_settings: BackendLoginUserSettings;
    user_organization: BackendLoginUserOrganization;
    user_subscription: BackendLoginUserSubscription;
  };
  auth: {
    token: string;
    expires_in: number;
    login_time: string;
  };
}

interface BackendMeResponse {
  message?: string;
  user: {
    user_profile: {
      id: string;
      user_name: string;
      username: string;
      email: string;
      avatar_url: string;
      birth_date?: string;
      phone_number?: string;
      created_at: string;
      updated_at?: string;
    };
    user_settings: {
      theme_mode?: string;
      private_profile?: boolean;
      auth_with_google?: boolean;
      auth_with_github?: boolean;
    };
    user_organization: {
      id: string;
      unique_name: string;
      name: string;
      logo_url?: string;
      member_role?: string | string[] | null;
      member_since?: string;
    };
    current_plan: {
      id: string;
      plan_name: string;
      client_type: string;
      details: any;
    };
    current_plan_usage: {
      plan_id: string;
      plan_name: string;
      client_type: string;
      period_start: string;
      period_end: string;
      details: any;
    };
    usage_preference?: Record<string, unknown>;
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
  name?: string;
  username: string;
  email: string;
  password: string;
  user_name?: string;
}

export interface ActivateAccountPayload {
  token?: string;
  code?: string;
  email?: string;
}

const normalizeStorageUrl = (value?: string | null): string => {
  if (!value) return "";
  return getStorageUrl(value);
};

const normalizeThemeMode = (value?: string): "LIGHT" | "DARK" | undefined => {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (normalized === "DARK") return "DARK";
  if (normalized === "LIGHT") return "LIGHT";
  return undefined;
};

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
 * @deprecated - Mantida para referência, mas não utilizada atualmente
 */
const _mapBackendDataToUser = (data: BackendUserData): User => {
  const { profile, settings, organization, current_plan, current_plan_usage } = data;

  return {
    // Profile
    id: profile.id,
    user_name: profile.user_name,
    username: profile.username,
    email: profile.email,
    avatar_url: getStorageUrl(profile.avatar_url),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    birth_date: profile.birth_date,
    phone_number: profile.phone_number,

    // Settings
    theme_mode: normalizeThemeMode(settings?.theme_mode),
    private_profile: settings?.private_profile,
    auth_with_google: settings?.auth_with_google,

    // Organization (Optional)
    org_id: organization?.id,
    org_name: organization?.org_name,
    org_unique_name: organization?.unique_name,
    org_logo_url: normalizeStorageUrl(organization?.org_logo_url),
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

    // App Preferences
    usage_preference: data.usage_preference || settings?.usage_preference || {},
  };
};

/**
 * Converte a resposta de login do backend para o modelo de usuário do frontend.
 */
const mapLoginResponseToUser = (data: BackendAuthResponse): User => {
  const { user } = data;
  const organization = user.user_organization;

  return {
    // Profile
    id: user.user_profile.id,
    user_name: user.user_profile.name,
    username: user.user_profile.username,
    email: user.user_profile.email,
    avatar_url: getStorageUrl(user.user_profile.avatar_url),

    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode),
    private_profile: user.user_settings.private_profile,

    // Organization
    org_id: organization?.id,
    org_name: organization?.name,
    org_unique_name: organization?.unique_name,
    org_logo_url: normalizeStorageUrl(organization?.logo_url),
    org_member_role: organization?.role,

    // Plan
    plan_id: user.user_subscription.plan_id,
    plan_name: user.user_subscription.plan_name,
  };
};

/**
 * Converte a resposta de /me do backend para o modelo de usuário do frontend.
 */
const mapMeResponseToUser = (data: BackendMeResponse): User => {
  const { user } = data;
  const organization = user.user_organization;
  const currentPlan = user.current_plan;
  const currentPlanUsage = user.current_plan_usage;

  return {
    // Profile
    id: user.user_profile.id,
    user_name: user.user_profile.user_name,
    username: user.user_profile.username,
    email: user.user_profile.email,
    avatar_url: getStorageUrl(user.user_profile.avatar_url),
    birth_date: user.user_profile.birth_date,
    phone_number: user.user_profile.phone_number,
    created_at: user.user_profile.created_at,
    updated_at: user.user_profile.updated_at,

    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode),
    private_profile: user.user_settings.private_profile,
    auth_with_google: user.user_settings.auth_with_google,

    // Organization
    org_id: organization?.id,
    org_name: organization?.name,
    org_unique_name: organization?.unique_name,
    org_logo_url: normalizeStorageUrl(organization?.logo_url),
    org_member_role: organization?.member_role,
    org_member_since: organization?.member_since,

    // Plan
    plan_id: currentPlan?.id,
    plan_name: currentPlan?.plan_name,
    plan_client_type: currentPlan?.client_type,
    plan_details: currentPlan?.details,

    // Usage
    usage_plan_id: currentPlanUsage?.plan_id,
    usage_plan_name: currentPlanUsage?.plan_name,
    usage_client_type: currentPlanUsage?.client_type,
    usage_period_start: currentPlanUsage?.period_start,
    usage_period_end: currentPlanUsage?.period_end,
    usage_details: currentPlanUsage?.details,

    // App Preferences
    usage_preference: user.usage_preference || {},
  };
};

// --- 4. Serviços de Autenticação ---

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, credentials);
  const data = await handleResponse<BackendAuthResponse>(response);

  if (data.status === "OK" && data.user && data.auth) {
    return {
      user: mapLoginResponseToUser(data),
      token: data.auth.token,
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

  if (data.user) {
    return mapMeResponseToUser(data);
  }

  throw new Error("Formato de resposta do perfil inválido.");
};

// Alias para compatibilidade
export const getUserDataService = getUserData;

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

export const activateAccountService = async (
  payload: ActivateAccountPayload
): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.ACTIVATE_ACCOUNT, payload);
  const data = await handleResponse<{ message?: string }>(response);

  return {
    message: data?.message || "Conta ativada com sucesso",
  };
};

export const logout = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.LOGOUT);
  return await handleResponse<void>(response);
};

export const initiateGoogleLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  window.location.href = `${baseUrl}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const initiateGithubLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  window.location.href = `${baseUrl}${API_ENDPOINTS.GITHUB_AUTH}`;
};

export const initiateMicrosoftLogin = (): void => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  window.location.href = `${baseUrl}${API_ENDPOINTS.MICROSOFT_AUTH}`;
};

export const updateUserData = async (
  userData: Partial<User> & { profilePicture?: File }
): Promise<Partial<User>> => {
  const normalizedUserData: Partial<User> & { profilePicture?: File } = {
    ...userData,
    ...(userData.theme_mode ? { theme_mode: normalizeThemeMode(userData.theme_mode) } : {}),
  };

  let body: FormData | Partial<User>;

  if (normalizedUserData.profilePicture instanceof File) {
    const formData = new FormData();
    formData.append("profilePicture", normalizedUserData.profilePicture);
    const { profilePicture, ...rest } = normalizedUserData;
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    }
    body = formData;
  } else {
    const { profilePicture, ...rest } = normalizedUserData;
    body = rest;
  }

  const response = await apiClient.put(API_ENDPOINTS.UPDATE_PROFILE, body);

  interface UpdateProfileResponse {
    user: {
      user_profile: BackendProfile;
      user_settings: BackendSettings;
      usage_preference?: Record<string, unknown>;
    };
    message: string;
    email_validation?: {
      pending: boolean;
      pending_email: string;
    };
  }

  const data = await handleResponse<UpdateProfileResponse>(response);

  // Mapeia a resposta do update profile
  return {
    id: data.user.user_profile.id,
    user_name: data.user.user_profile.user_name,
    username: data.user.user_profile.username,
    email: data.user.user_profile.email,
    avatar_url: getStorageUrl(data.user.user_profile.avatar_url),
    birth_date: data.user.user_profile.birth_date,
    phone_number: data.user.user_profile.phone_number,
    created_at: data.user.user_profile.created_at,
    updated_at: data.user.user_profile.updated_at,
    theme_mode: normalizeThemeMode(data.user.user_settings.theme_mode),
    private_profile: data.user.user_settings.private_profile,
    auth_with_google: data.user.user_settings.auth_with_google,
    usage_preference: data.user.usage_preference || {},
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
