import { z } from "zod";
import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";
import {
  ApiScopeSchema,
  ApiTokenCreateResponseSchema,
  ApiTokenSchema,
  type ApiToken,
  type ApiTokenCreateResponse,
  type ApiScope,
} from "./api-tokens.schema";

export type { ApiToken, ApiTokenCreateResponse, ApiScope };

export const fetchApiTokensScopes = async (): Promise<ApiScope[]> => {
  const response = await apiClient.get(API_ENDPOINTS.API_TOKENS_SCOPES);
  const raw = await handleResponse<unknown>(response);
  return z.array(ApiScopeSchema).parse(raw);
};

export const fetchApiTokens = async (): Promise<ApiToken[]> => {
  const response = await apiClient.get(API_ENDPOINTS.API_TOKENS_LIST);
  const raw = await handleResponse<unknown>(response);
  return z.array(ApiTokenSchema).parse(raw);
};

export const createApiToken = async (data: {
  name: string;
  scopes: string[];
  expiresAt: string | null;
  workspaceId?: string | null;
}): Promise<ApiTokenCreateResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.API_TOKENS_CREATE, data);
  const raw = await handleResponse<unknown>(response);
  return ApiTokenCreateResponseSchema.parse(raw);
};

export const revokeApiToken = async (id: string): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.API_TOKENS_REVOKE(id), {});
  await handleResponse<unknown>(response);
};
