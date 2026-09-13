import { API_BASE_URL, API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import {
  BackendAuthResponseSchema,
  BackendMeResponseSchema,
  SamlSsoDiscoverRequestSchema,
  SamlSsoDiscoverResponseSchema,
} from "./auth.schema";
import { mapLoginResponseToUser, mapMeResponseToUser } from "./auth.mappers";
import type {
  LoginCodeRequest,
  LoginCodeVerification,
  LoginCredentials,
  LoginResponse,
  SamlSsoDiscoverRequest,
  SamlSsoDiscoverResponse,
  User,
  AuthProvidersConfig,
} from "./auth.types";
import {
  LoginCodeRequestSchema,
  LoginCodeVerificationSchema,
  LoginCredentialsSchema,
} from "./auth.schema";

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  // Validate input
  const validCredentials = LoginCredentialsSchema.parse(credentials);
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN, validCredentials);
  const rawData = await handleResponse<unknown>(response, {
    skipSessionInvalidationOn401: true,
  });

  // Validate API output — use safeParse so Zod errors surface clearly in dev
  const result = BackendAuthResponseSchema.safeParse(rawData);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("[login] Response failed schema validation:", result.error.flatten());
    }
    throw new Error("Login response format is invalid. Please try again.");
  }

  const data = result.data;

  if (data.status === "OK" && data.user) {
    return {
      user: mapLoginResponseToUser(data),
      token: data.auth?.token, // Optional: absent in session-based auth
    };
  }

  throw new Error(data.message || "Erro desconhecido ao realizar login.");
};

export const requestLoginCode = async (payload: LoginCodeRequest): Promise<{ message: string }> => {
  const validPayload = LoginCodeRequestSchema.parse(payload);
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN_CODE_REQUEST, validPayload);
  return await handleResponse<{ message: string }>(response, {
    skipSessionInvalidationOn401: true,
  });
};

export const loginWithCode = async (payload: LoginCodeVerification): Promise<LoginResponse> => {
  const validPayload = LoginCodeVerificationSchema.parse(payload);
  const response = await apiClient.post(API_ENDPOINTS.SIGNIN_CODE_VERIFY, validPayload);
  const rawData = await handleResponse<unknown>(response, {
    skipSessionInvalidationOn401: true,
  });

  const result = BackendAuthResponseSchema.safeParse(rawData);
  if (!result.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("[loginWithCode] Response failed schema validation:", result.error.flatten());
    }
    throw new Error("Login response format is invalid. Please try again.");
  }

  const data = result.data;

  if (data.status === "OK" && data.user) {
    return {
      user: mapLoginResponseToUser(data),
      token: data.auth?.token,
    };
  }

  throw new Error(data.message || "Erro desconhecido ao realizar login.");
};

export const discoverSamlSso = async (
  payload: SamlSsoDiscoverRequest
): Promise<SamlSsoDiscoverResponse> => {
  const validPayload = SamlSsoDiscoverRequestSchema.parse(payload);
  const response = await apiClient.post(API_ENDPOINTS.SAML_SSO_DISCOVER, validPayload);
  const rawData = await handleResponse<unknown>(response, {
    skipSessionInvalidationOn401: true,
  });

  const parsed = SamlSsoDiscoverResponseSchema.safeParse(rawData);
  if (!parsed.success) {
    if (process.env.NODE_ENV === "development") {
      console.error("[discoverSamlSso] Response failed schema validation:", parsed.error.flatten());
    }
    throw new Error("SSO discovery response format is invalid. Please try again.");
  }

  return parsed.data;
};

export const startSamlSsoLogin = (workspaceId: string): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.SAML_SSO_LOGIN(workspaceId)}`;
};

export const logout = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.LOGOUT);
  return await handleResponse<void>(response, { skipSessionInvalidationOn401: true });
};

export const getUserData = async (): Promise<User> => {
  const response = await apiClient.get(API_ENDPOINTS.ME);
  const rawData = await handleResponse<unknown>(response, {
    invalidateSessionOn401: true,
  });
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

// Alias for compatibility
export const getUserDataService = getUserData;

export const initiateGoogleLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.GOOGLE_AUTH}`;
};

export const initiateGithubLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.GITHUB_AUTH}`;
};

export const initiateMicrosoftLogin = (): void => {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.MICROSOFT_AUTH}`;
};

export const getAuthProvidersService = async (): Promise<AuthProvidersConfig> => {
  const res = await apiClient.get(API_ENDPOINTS.AUTH_PROVIDERS);
  return await handleResponse<AuthProvidersConfig>(res, {
    skipSessionInvalidationOn401: true,
  });
};
