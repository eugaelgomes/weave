import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";

export interface ApiToken {
  id: string;
  name: string;
  key_prefix: string;
  organization_id?: string | null;
  scopes: string[];
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at?: string;
  token?: string; // Solo presente na criação
}

export interface ApiTokenCreateResponse {
  message: string;
  token: string;
  record: ApiToken;
}

export interface ApiScope {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface ApiScopesInfo {
  resources: Array<{
    id: string;
    name: string;
    description: string;
    actions: Array<{
      id: string;
      name: string;
      description: string;
      scopeName: string;
    }>;
  }>;
}

export const fetchApiTokensScopes = async (): Promise<ApiScopesInfo> => {
  const response = await apiClient.get(API_ENDPOINTS.API_TOKENS_SCOPES);
  return handleResponse<ApiScopesInfo>(response);
};

export const fetchApiTokens = async (): Promise<ApiToken[]> => {
  const response = await apiClient.get(API_ENDPOINTS.API_TOKENS_LIST);
  return handleResponse<ApiToken[]>(response);
};

export const createApiToken = async (data: {
  name: string;
  scopes: string[];
  expiresAt: string | null;
}): Promise<ApiTokenCreateResponse> => {
  const response = await apiClient.post(API_ENDPOINTS.API_TOKENS_CREATE, data);
  return handleResponse<ApiTokenCreateResponse>(response);
};

export const revokeApiToken = async (id: string): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.API_TOKENS_REVOKE(id), {});
  return handleResponse<void>(response);
};

export const deleteApiToken = async (id: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.API_TOKENS_DELETE(id));
  return handleResponse<void>(response);
};
