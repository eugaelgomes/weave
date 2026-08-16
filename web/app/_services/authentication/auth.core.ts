import { API_BASE_URL, API_ENDPOINTS } from "../api-methods";
import { apiClient, handleResponse } from "../api-methods";
import { BackendAuthResponseSchema, BackendMeResponseSchema } from "./auth.schema";
import { mapLoginResponseToUser, mapMeResponseToUser } from "./auth.mappers";
import type { LoginCredentials, LoginResponse, User } from "./auth.types";
import { LoginCredentialsSchema } from "./auth.schema";

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
