import { API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { backendProfileEmailToUser } from "./auth.mappers";
import { normalizeThemeMode } from "./auth.utils";
import type {
  User,
  CreateUserData,
  ActivateAccountPayload,
  BackendProfile,
  BackendSettings,
} from "./auth.types";
import { CreateUserDataSchema, ActivateAccountPayloadSchema } from "./auth.schema";

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
    // Error extraction logic maintained...
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

export const resendActivationCodeService = async (email: string): Promise<{ message: string }> => {
  const response = await apiClient.post(API_ENDPOINTS.RESEND_ACTIVATION_CODE, {
    email: email.trim(),
  });
  const data = await handleResponse<{ message?: string }>(response, {
    skipSessionInvalidationOn401: true,
  });
  return { message: data?.message || "Código reenviado." };
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

  // Map the update profile response
  return {
    id: data.user.user_profile.id,
    user_name: data.user.user_profile.user_name,
    username: data.user.user_profile.username,
    email: backendProfileEmailToUser(data.user.user_profile.email),
    avatar_url: getStorageUrl(data.user.user_profile.avatar_url ?? ""),
    birth_date: data.user.user_profile.birth_date ?? undefined,
    phone_number: data.user.user_profile.phone_number ?? undefined,
    created_at: data.user.user_profile.created_at,
    updated_at: data.user.user_profile.updated_at ?? undefined, // Fix 'null' to 'undefined'
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

export const deleteUser = async (): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.DELETE_ACCOUNT);
  return await handleResponse<void>(response);
};
