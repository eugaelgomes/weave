const crypto = require("crypto");

const AI_PROVIDERS = {
  GEMINI: "gemini",
  OPENAI: "openai",
};

const AI_MODELS = {
  GEMINI_3_5_FLASH: "gemini-3.5-flash",
  GEMINI_3_1_PRO_PREVIEW: "gemini-3.1-pro-preview",
  OPENAI_GPT_5_4_MINI: "gpt-5.4-mini",
  OPENAI_GPT_5_4: "gpt-5.4",
};
const LLM_PROVIDER_TIMEOUT_MS = Number.parseInt(
  process.env.WEAVE_LLM_PROVIDER_TIMEOUT_MS || "18000",
  10
);
const LLM_PROVIDER_MAX_RETRIES = Number.parseInt(
  process.env.WEAVE_LLM_PROVIDER_MAX_RETRIES || "1",
  10
);

const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  maxOutputTokens: 8192,
  model: AI_MODELS.GEMINI_3_1_PRO_PREVIEW,
  provider: AI_PROVIDERS.GEMINI,
  retry: {
    backoffFactor: 2,
    initialDelay: 1000,
    maxRetries: LLM_PROVIDER_MAX_RETRIES,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  temperature: 0.7,
  timeout: LLM_PROVIDER_TIMEOUT_MS,
  topK: 40,
  topP: 0.95,
};

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
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

const cacheConfig = {
  cacheKey: (provider, prompt, context) => {
    const hash = crypto.createHash("sha256");
    hash.update(`${provider}-${prompt}-${JSON.stringify(context)}`);
    return hash.digest("hex");
  },
  enabled: true,
  maxSize: 100,
  ttl: 3600,
};

/**
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
function createLlmConfigError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * @param {string|undefined|null} modelName
 * @returns {string}
 */
function normalizeModelName(modelName) {
  if (typeof modelName !== "string") {
    return "";
  }

  return modelName
    .trim()
    .toLowerCase()
    .replace(/^models\//, "");
}

/**
 * @returns {string}
 */
function resolveDefaultModelName() {
  if (openaiConfig.apiKey) {
    return openaiConfig.model;
  }

  if (geminiConfig.apiKey) {
    return geminiConfig.model;
  }

  return openaiConfig.model;
}

/**
 * @param {string} provider
 * @returns {object}
 */
function getProviderConfig(provider) {
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

/**
 * @param {string} modelName
 * @returns {string}
 */
function getProviderByModelName(modelName) {
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

module.exports = {
  AI_MODELS,
  AI_PROVIDERS,
  cacheConfig,
  geminiConfig,
  getProviderByModelName,
  getProviderConfig,
  normalizeModelName,
  openaiConfig,
  resolveDefaultModelName,
};
