"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import {
  fetchApiTokens,
  createApiToken,
  revokeApiToken,
  fetchApiTokensScopes,
  type ApiToken,
  type ApiScope,
} from "../_services/api-tokens-service/api-tokens.service";

type ApiTokensContextType = {
  apiTokens: ApiToken[];
  scopesInfo: ApiScope[] | null;
  loadingTokens: boolean;

  loadApiTokens: () => Promise<void>;
  generateApiToken: (
    name: string,
    scopes: string[],
    expiresAt: string | null,
    workspaceId?: string | null
  ) => Promise<{ success: boolean; data?: ApiToken; message?: string }>;
  revokeToken: (id: string) => Promise<{ success: boolean; message?: string }>;
};

const ApiTokensContext = createContext<ApiTokensContextType | undefined>(undefined);

export const ApiTokensProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated } = useAuth();

  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [scopesInfo, setScopesInfo] = useState<ApiScope[] | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const loadApiTokens = async () => {
    if (!authenticated) return;

    setLoadingTokens(true);
    try {
      const [tokens, scopes] = await Promise.all([fetchApiTokens(), fetchApiTokensScopes()]);
      setApiTokens(tokens);
      setScopesInfo(scopes);
    } catch (error) {
      console.error("Erro ao carregar API tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Carregar tokens automaticamente apenas se autenticado
  useEffect(() => {
    if (authenticated) {
      loadApiTokens();
    } else {
      setApiTokens([]);
      setScopesInfo(null);
    }
  }, [authenticated]);

  const generateApiToken = async (
    name: string,
    scopes: string[],
    expiresAt: string | null,
    workspaceId?: string | null
  ) => {
    try {
      const response = await createApiToken({ name, scopes, expiresAt, workspaceId });
      const fullTokenRecord = {
        ...response.record,
        token: response.token, // store plain token so UI can display it once
      };
      setApiTokens((prev) => [fullTokenRecord, ...prev]);
      return { success: true, data: fullTokenRecord };
    } catch (error) {
      console.error("Erro ao criar API token:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const revokeToken = async (id: string) => {
    try {
      await revokeApiToken(id);
      setApiTokens((prev) =>
        prev.map((token) =>
          token.id === id ? { ...token, revoked_at: new Date().toISOString() } : token
        )
      );
      return { success: true };
    } catch (error) {
      console.error("Erro ao revogar API token:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return (
    <ApiTokensContext.Provider
      value={{
        apiTokens,
        scopesInfo,
        loadingTokens,
        loadApiTokens,
        generateApiToken,
        revokeToken,
      }}
    >
      {children}
    </ApiTokensContext.Provider>
  );
};

export const useApiTokens = () => {
  const ctx = useContext(ApiTokensContext);
  if (!ctx) throw new Error("useApiTokens must be used within ApiTokensProvider");
  return ctx;
};

export default ApiTokensContext;
