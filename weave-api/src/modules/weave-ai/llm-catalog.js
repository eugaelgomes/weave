const LLM_PROVIDERS = Object.freeze({
  GEMINI: "gemini",
  OPENAI: "openai",
});

const PROVIDERS_METADATA = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: {
    id: "gemini",
    isDefault: true,
    logoUrl: "/ai-models/gemini.svg",
    name: "Google Gemini",
  },
  [LLM_PROVIDERS.OPENAI]: {
    id: "openai",
    isDefault: false,
    logoUrl: "/ai-models/openai.svg",
    name: "OpenAI",
  },
});

const MODELS_REGISTRY = Object.freeze([
  // Gemini Models
  {
    contextWindow: 1048576,
    deprecated: false,
    description: "Fast and versatile model for general tasks.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gemini-3.5-flash",
    maxOutputTokens: 8192,
    name: "Gemini 3.5 Flash",
    providerId: LLM_PROVIDERS.GEMINI,
    supportedForAgents: true,
    tags: ["fast", "cost-effective"],
    version: "3.5",
  },
  {
    contextWindow: 2097152,
    deprecated: false,
    description: "Highly capable model for complex reasoning tasks.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gemini-3.1-pro-preview",
    maxOutputTokens: 8192,
    name: "Gemini 3.1 Pro (Preview)",
    providerId: LLM_PROVIDERS.GEMINI,
    supportedForAgents: true,
    tags: ["advanced", "reasoning"],
    version: "3.1 Pro",
  },

  // OpenAI Models
  {
    contextWindow: 128000,
    deprecated: false,
    description: "Small, fast and cost-effective intelligence model.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gpt-4.1-mini",
    maxOutputTokens: 16384,
    name: "GPT-4.1 Mini",
    providerId: LLM_PROVIDERS.OPENAI,
    supportedForAgents: true,
    tags: ["fast", "efficient"],
    version: "4.1 Mini",
  },
  {
    contextWindow: 128000,
    deprecated: false,
    description: "Advanced intelligence model.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gpt-5.1",
    maxOutputTokens: 4096,
    name: "GPT-5.1",
    providerId: LLM_PROVIDERS.OPENAI,
    supportedForAgents: true,
    tags: ["advanced"],
    version: "5.1",
  },
  {
    contextWindow: 128000,
    deprecated: false,
    description: "Advanced intelligence model.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gpt-5.4",
    maxOutputTokens: 4096,
    name: "GPT-5.4",
    providerId: LLM_PROVIDERS.OPENAI,
    supportedForAgents: true,
    tags: ["advanced"],
    version: "5.4",
  },
  {
    contextWindow: 128000,
    deprecated: false,
    description: "Small, fast and cost-effective advanced intelligence model.",
    features: ["vision", "function_calling", "system_instructions"],
    id: "gpt-5.4-mini",
    maxOutputTokens: 16384,
    name: "GPT-5.4 Mini",
    providerId: LLM_PROVIDERS.OPENAI,
    supportedForAgents: true,
    tags: ["fast", "efficient"],
    version: "5.4 Mini",
  },
]);

/**
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   isDefault: boolean,
 *   logoUrl: string|null,
 *   models: Array<any>
 * }>}
 */
function getProvidersWithModels() {
  return Object.values(LLM_PROVIDERS).map((providerId) => {
    const providerMeta = PROVIDERS_METADATA[providerId];
    const providerModels = MODELS_REGISTRY.filter(
      (m) => m.providerId === providerId
    );

    return {
      id: providerMeta.id,
      isDefault: providerMeta.isDefault,
      logoUrl: providerMeta.logoUrl,
      models: providerModels,
      name: providerMeta.name,
    };
  });
}

/**
 * Kept for backwards compatibility where it might still be used,
 * but returns an array of structured models instead of just versions.
 * @param {string} provider
 * @returns {Array<any>}
 */
function getModelEntries(provider) {
  return MODELS_REGISTRY.filter((m) => m.providerId === provider);
}

module.exports = {
  getModelEntries,
  getProvidersWithModels,
  LLM_PROVIDERS,
  MODELS_REGISTRY,
  PROVIDERS_METADATA,
};
