import crypto from "crypto";
import { URL } from "url";

export const AI_PROVIDERS = {
  GEMINI: "gemini" as const,
  OPENAI: "openai" as const,
};

export type AiProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const AI_MODELS = {
  GEMINI_3_1_PRO_PREVIEW: "gemini-3.1-pro-preview",
  GEMINI_3_5_FLASH: "gemini-3.5-flash",
  OPENAI_GPT_4_1_MINI: "gpt-4.1-mini",
  OPENAI_GPT_5_1: "gpt-5.1",
  OPENAI_GPT_5_4: "gpt-5.4",
  OPENAI_GPT_5_4_MINI: "gpt-5.4-mini",
} as const;

const LLM_PROVIDER_TIMEOUT_MS = Number.parseInt(
  process.env.WEAVE_LLM_PROVIDER_TIMEOUT_MS || "18000",
  10
);
const LLM_PROVIDER_MAX_RETRIES = Number.parseInt(
  process.env.WEAVE_LLM_PROVIDER_MAX_RETRIES || "1",
  10
);

export interface ProviderRetryConfig {
  backoffFactor: number;
  initialDelay: number;
  maxRetries: number;
}

export interface ProviderConfig {
  apiKey: string | undefined;
  baseURL: string;
  maxTokens: number;
  model: string;
  provider: AiProvider;
  retry: ProviderRetryConfig;
  temperature: number;
  timeout: number;
  topP: number;
}

export const geminiConfig: ProviderConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  maxTokens: 8192,
  model: AI_MODELS.GEMINI_3_1_PRO_PREVIEW,
  provider: AI_PROVIDERS.GEMINI,
  retry: {
    backoffFactor: 2,
    initialDelay: 1000,
    maxRetries: LLM_PROVIDER_MAX_RETRIES,
  },
  temperature: 0.7,
  timeout: LLM_PROVIDER_TIMEOUT_MS,
  topP: 0.95,
};

const foundryUrl = process.env.FOUNDRY_PROJECT_URL;
let resolvedBaseUrl = foundryUrl;
if (foundryUrl && foundryUrl.includes("/api/projects/")) {
  try {
    const parsed = new URL(foundryUrl);
    resolvedBaseUrl = `${parsed.origin}/models`;
  } catch {
    // ignore
  }
}

export const openaiConfig: ProviderConfig = {
  apiKey: process.env.FOUNDRY_API_KEY || process.env.OPENAI_API_KEY,
  baseURL:
    resolvedBaseUrl ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1",
  maxTokens: 4096,
  model: AI_MODELS.OPENAI_GPT_5_4_MINI,
  provider: AI_PROVIDERS.OPENAI,
  retry: {
    backoffFactor: 2,
    initialDelay: 1000,
    maxRetries: LLM_PROVIDER_MAX_RETRIES,
  },
  temperature: 0.7,
  timeout: LLM_PROVIDER_TIMEOUT_MS,
  topP: 0.9,
};

export interface CacheConfig {
  cacheKey: (provider: string, prompt: string, context: any) => string;
  enabled: boolean;
  maxSize: number;
  ttl: number;
}

export const cacheConfig: CacheConfig = {
  cacheKey: (provider: string, prompt: string, context: any) => {
    const hash = crypto.createHash("sha256");
    hash.update(`${provider}-${prompt}-${JSON.stringify(context)}`);
    return hash.digest("hex");
  },
  enabled: true,
  maxSize: 100,
  ttl: 3600,
};

function createLlmConfigError(code: string, message: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

export function normalizeModelName(modelName: string | undefined | null): string {
  if (typeof modelName !== "string") {
    return "";
  }

  return modelName
    .trim()
    .toLowerCase()
    .replace(/^models\//, "");
}

export function resolveDefaultModelName(): string {
  if (openaiConfig.apiKey) {
    return openaiConfig.model;
  }

  if (geminiConfig.apiKey) {
    return geminiConfig.model;
  }

  return openaiConfig.model;
}

export function getProviderConfig(provider: string): ProviderConfig {
  switch (provider) {
    case AI_PROVIDERS.GEMINI:
      return geminiConfig;
    case AI_PROVIDERS.OPENAI:
      return openaiConfig;
    default:
      throw createLlmConfigError(
        "ENGINE_UNKNOWN_PROVIDER",
        `Unknown LLM provider: ${provider}`
      );
  }
}

export function getProviderByModelName(modelName: string): AiProvider {
  if (!modelName) {
    throw createLlmConfigError(
      "ENGINE_MODEL_REQUIRED",
      "Model name is required"
    );
  }

  const normalized = normalizeModelName(modelName);

  if (normalized === "auto") {
    return getProviderByModelName(resolveDefaultModelName());
  }

  if (normalized === "openai") {
    return AI_PROVIDERS.OPENAI;
  }

  if (normalized === "gemini") {
    return AI_PROVIDERS.GEMINI;
  }

  if (normalized.startsWith("gemini-")) {
    return AI_PROVIDERS.GEMINI;
  }

  if (
    normalized.startsWith("gpt-") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4") ||
    normalized.startsWith("chatgpt-")
  ) {
    return AI_PROVIDERS.OPENAI;
  }

  throw createLlmConfigError(
    "ENGINE_UNSUPPORTED_MODEL",
    `Unsupported model: ${normalized}`
  );
}
