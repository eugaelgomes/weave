import { jwtDecode } from "jwt-decode";
import { API_BASE_URL, API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import { notifyUnauthorized } from "../session-invalidation";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";
import {
  type UserPreferences,
  type PlanDetails,
  type UsageDetails,
  type User,
  type BackendProfile,
  type BackendSettings,
  type BackendOrganization,
  type BackendAuthResponse,
  type BackendMeResponse,
  type LoginCredentials,
  type CreateUserData,
  type ActivateAccountPayload,
  type OrgDefaultArea,
  BackendAuthResponseSchema,
  BackendMeResponseSchema,
  CreateUserDataSchema,
  LoginCredentialsSchema,
  ActivateAccountPayloadSchema
} from "./auth.schema";

export type {
  UserPreferences,
  PlanDetails,
  UsageDetails,
  User,
  LoginCredentials,
  CreateUserData,
  ActivateAccountPayload,
  OrgDefaultArea,
};

// Interface unificada dos dados que vêm dentro de 'user_data' (deprecated func support)
interface BackendUserData {
  profile: BackendProfile;
  settings?: BackendSettings;
  organization?: BackendOrganization;
  current_plan?: any;
  current_plan_usage?: any;
  usage_preference?: Record<string, unknown>;
}

export interface LoginResponse {
  user: User;
  token: string;
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

/** Maps API profile email (nullable / empty) to {@link User} optional email. */
const backendProfileEmailToUser = (email: BackendProfile["email"]): User["email"] =>
  email ? email : undefined;

const mapOrgDefaultAreaToUser = (
  area: OrgDefaultArea | null | undefined
): User["org_default_area"] => {
  if (area == null) return undefined;
  return {
    id: area.id ?? undefined,
    name: area.name ?? undefined,
    slug: area.slug ?? undefined,
    role: area.role ?? undefined,
    member_since: area.member_since ?? undefined,
    description: area.description ?? undefined,
    properties: area.properties ?? {},
  };
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
    email: backendProfileEmailToUser(profile.email),
    avatar_url: getStorageUrl(profile.avatar_url ?? ""),
    created_at: profile.created_at,
    updated_at: profile.updated_at ?? undefined, // Corrige 'null' para 'undefined'
    birth_date: profile.birth_date ?? undefined,
    phone_number: profile.phone_number ?? undefined,
    public_id: profile.public_id,


    // Settings
    theme_mode: normalizeThemeMode(settings?.theme_mode ?? undefined),
    private_profile: settings?.private_profile ?? undefined,
    auth_with_google: settings?.auth_with_google ?? undefined,

    // Organization (Optional)
    org_id: organization?.id,
    org_public_id: organization?.public_id,
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
    public_id: user.user_profile.public_id,


    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode),
    private_profile: user.user_settings.private_profile,

    // Organization
    org_id: organization?.id,
    org_public_id: organization?.public_id,
    org_name: organization?.name,

    org_unique_name: organization?.unique_name,
    org_logo_url: normalizeStorageUrl(organization?.logo_url),
    org_member_role: organization?.role,
    org_member_since: organization?.member_since ?? undefined,
    org_default_area: mapOrgDefaultAreaToUser(organization?.default_area ?? undefined),

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
    email: backendProfileEmailToUser(user.user_profile.email),
    avatar_url: getStorageUrl(user.user_profile.avatar_url ?? ""),
    birth_date: user.user_profile.birth_date ?? undefined,
    phone_number: user.user_profile.phone_number ?? undefined,
    created_at: user.user_profile.created_at,
    updated_at: user.user_profile.updated_at ?? undefined, // Corrige 'null' para 'undefined'
    public_id: user.user_profile.public_id,

    // Settings
    theme_mode: normalizeThemeMode(user.user_settings.theme_mode ?? undefined),
    private_profile: user.user_settings.private_profile ?? undefined,
    auth_with_google: user.user_settings.auth_with_google ?? undefined,

    // Organization
    org_id: organization?.id,
    org_public_id: organization?.public_id,
    org_name: organization?.name,

    org_unique_name: organization?.unique_name,
    org_logo_url: normalizeStorageUrl(organization?.logo_url),
    org_member_role: organization?.member_role,
    org_member_since: organization?.member_since ?? undefined,
    org_default_area: mapOrgDefaultAreaToUser(organization?.default_area ?? undefined),

    // Plan
    plan_id: currentPlan?.id ?? undefined,
    plan_name: currentPlan?.plan_name ?? undefined,
    plan_client_type: currentPlan?.client_type ?? undefined,
    plan_details: currentPlan?.details as User["plan_details"],

    // Usage
    usage_plan_id: currentPlanUsage?.plan_id ?? undefined,
    usage_plan_name: currentPlanUsage?.plan_name ?? undefined,
    usage_client_type: currentPlanUsage?.client_type ?? undefined,
    usage_period_start: currentPlanUsage?.period_start ?? undefined,
    usage_period_end: currentPlanUsage?.period_end ?? undefined,
    usage_details: currentPlanUsage?.details as User["usage_details"],

    // App Preferences
    usage_preference: user.usage_preference || {},
  };
};

// --- 4. Serviços de Autenticação ---

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  // Valida o input
  const validCredentials = LoginCredentialsSchema.parse(credentials);
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, validCredentials);
  const rawData = await handleResponse<unknown>(response, {
    skipSessionInvalidationOn401: true,
  });

  // Valida o output da API
  const data = BackendAuthResponseSchema.parse(rawData);

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
    if (response.status === 401) {
      notifyUnauthorized();
      throw new Error("Unauthorized");
    }
    if (response.status === 404) throw new Error("Usuário não encontrado");
    throw new Error("Erro ao buscar dados do usuário");
  }

  const rawData = await handleResponse<unknown>(response);
  const parsed = BackendMeResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getUserData] /users/me response failed validation", parsed.error.flatten());
    }
    throw new Error("Resposta de perfil inválida (validação).");
  }
  const data = parsed.data;

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
  let body = userData;
  if (!(userData instanceof FormData)) {
    body = CreateUserDataSchema.parse(userData);
  }
  const response = await apiClient.post(API_ENDPOINTS.CREATE_ACCOUNT, body);

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
  const validPayload = ActivateAccountPayloadSchema.parse(payload);
  const response = await apiClient.post(API_ENDPOINTS.ACTIVATE_ACCOUNT, validPayload);
  const data = await handleResponse<{ message?: string }>(response, {
    skipSessionInvalidationOn401: true,
  });

  return {
    message: data?.message || "Conta ativada com sucesso",
  };
};

export const logout = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.LOGOUT);
  return await handleResponse<void>(response, { skipSessionInvalidationOn401: true });
};

export const initiateGoogleLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const initiateGithubLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.GITHUB_AUTH}`;
};

export const initiateMicrosoftLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.MICROSOFT_AUTH}`;
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
    email: backendProfileEmailToUser(data.user.user_profile.email),
    avatar_url: getStorageUrl(data.user.user_profile.avatar_url ?? ""),
    birth_date: data.user.user_profile.birth_date ?? undefined,
    phone_number: data.user.user_profile.phone_number ?? undefined,
    created_at: data.user.user_profile.created_at,
    updated_at: data.user.user_profile.updated_at ?? undefined, // Corrige 'null' para 'undefined'
    public_id: data.user.user_profile.public_id,
    theme_mode: normalizeThemeMode(data.user.user_settings.theme_mode ?? undefined),

    private_profile: data.user.user_settings.private_profile ?? undefined,
    auth_with_google: data.user.user_settings.auth_with_google ?? undefined,
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
  const trimmed = email.trim();
  if (emailLocalPartContainsPlus(trimmed)) {
    throw new Error("E-mails com alias (+) no endereço não são permitidos.");
  }
  const response = await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email: trimmed });
  return await handleResponse<{ message: string }>(response, {
    skipSessionInvalidationOn401: true,
  });
};

export const resetPassword = async (
  token: string,
  password: string
): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, {
    token,
    password,
  });
  return await handleResponse<{ message: string }>(response, {
    skipSessionInvalidationOn401: true,
  });
};
