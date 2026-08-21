/**
 * Configuration options for creating a LangChain model instance
 */
export interface ModelFactoryOptions {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  thinking?: {
    enabled: boolean;
    budgetTokens?: number;
  };
  streaming?: boolean;
}
