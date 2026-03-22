/* eslint-disable sort-keys */
/**
 * LLMs providers
 */
const LLM_PROVIDERS = {
  PERPLEXITY: "perplexity",
  OPENAI: "openai",
  GEMINI: "gemini",
  CLAUDE: "claude",
};

/**
 * LLMs models by provider
 */
const LLM_MODELS = {
  [LLM_PROVIDERS.PERPLEXITY]: {
    DEFAULT: "sonar-pro",
    REASONING: "sonar-reasoning-pro",
    LEGACY: "pplx-online",
  },
  [LLM_PROVIDERS.OPENAI]: {
    DEFAULT: "gpt-5.4",
    LIGHT: "gpt-4o-mini",
    LEGACY: "gpt-4o",
    REASONING: "o3-mini",
  },
  [LLM_PROVIDERS.GEMINI]: {
    DEFAULT: "gemini-3.1-flash",
    PRO: "gemini-3.1-pro",
    LEGACY: "gemini-2.0-flash",
    REASONING: "gemini-3.1-pro-deep-think",
  },
  [LLM_PROVIDERS.CLAUDE]: {
    DEFAULT: "claude-4.6-sonnet-latest",
    LIGHT: "claude-4.6-haiku-latest",
    LEGACY: "claude-3-5-sonnet-latest",
  },
};

/**
 * Configurações de requisição padrão.
 */
const DEFAULT_REQUEST_SETTINGS = {
  timeout: 30000,
  retry: {
    maxRetries: 3,
    backoffFactor: 2,
    initialDelay: 1000,
  },
};

const resolveApiKey = (envVars = []) => {
  const keyName = envVars.find((name) => process.env[name]);
  return keyName ? process.env[keyName] : undefined;
};

/**
 * Módulos de configuração: LLMs.
 */

const OpenAIModule = {
  createConfig: ({
    model = LLM_MODELS[LLM_PROVIDERS.OPENAI].DEFAULT,
    apiKey = resolveApiKey(["OPENAI_API_KEY", "OPENAI_KEY"]),
    customRequest = {},
  } = {}) => {
    if (!apiKey)
      throw new Error(`API key ausente para ${LLM_PROVIDERS.OPENAI}`);

    return {
      provider: LLM_PROVIDERS.OPENAI,
      baseURL: "https://api.openai.com/v1",
      selectedModel: model,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      capabilities: { streaming: true, tools: true, jsonResponse: true },
      limits: { maxTokens: 100000, temperature: 0.7, topP: 0.95 },
      request: { ...DEFAULT_REQUEST_SETTINGS, ...customRequest },
    };
  },
};

const GeminiModule = {
  createConfig: ({
    model = LLM_MODELS[LLM_PROVIDERS.GEMINI].DEFAULT,
    apiKey = resolveApiKey(["GEMINI_API_KEY"]),
    customRequest = {},
  } = {}) => {
    if (!apiKey)
      throw new Error(`API key ausente para ${LLM_PROVIDERS.GEMINI}`);

    return {
      provider: LLM_PROVIDERS.GEMINI,
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      selectedModel: model,
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      capabilities: { streaming: true, tools: true, safetySettings: true },
      limits: {
        maxOutputTokens: 16384,
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
      },
      request: { ...DEFAULT_REQUEST_SETTINGS, ...customRequest },
    };
  },
};

const ClaudeModule = {
  createConfig: ({
    model = LLM_MODELS[LLM_PROVIDERS.CLAUDE].DEFAULT,
    apiKey = resolveApiKey(["CLAUDE_API_KEY", "ANTHROPIC_API_KEY"]),
    customRequest = {},
  } = {}) => {
    if (!apiKey)
      throw new Error(`API key ausente para ${LLM_PROVIDERS.CLAUDE}`);

    return {
      provider: LLM_PROVIDERS.CLAUDE,
      baseURL: "https://api.anthropic.com",
      selectedModel: model,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      capabilities: { streaming: true, tools: true, vision: true },
      limits: { maxTokens: 8192, temperature: 0.6, topP: 0.999 },
      request: { ...DEFAULT_REQUEST_SETTINGS, ...customRequest },
    };
  },
};

const PerplexityModule = {
  createConfig: ({
    model = LLM_MODELS[LLM_PROVIDERS.PERPLEXITY].DEFAULT,
    apiKey = resolveApiKey(["PERPLEXITY_API_KEY"]),
    customRequest = {},
  } = {}) => {
    if (!apiKey)
      throw new Error(`API key ausente para ${LLM_PROVIDERS.PERPLEXITY}`);

    return {
      provider: LLM_PROVIDERS.PERPLEXITY,
      baseURL: "https://api.perplexity.ai",
      selectedModel: model,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      capabilities: { streaming: true, webSearch: true, tools: false },
      limits: { maxTokens: 4000, temperature: 0.7, topP: 0.9 },
      request: { ...DEFAULT_REQUEST_SETTINGS, ...customRequest },
    };
  },
};

/**
 * Export LLMs providers, models e módulos de configuração.
 */
module.exports = {
  LLM_PROVIDERS,
  LLM_MODELS,
  OpenAIModule,
  GeminiModule,
  ClaudeModule,
  PerplexityModule,
};
