const LLM_PROVIDERS = Object.freeze({
  GEMINI: "gemini",
  OPENAI: "openai",
});

const PROVIDERS_METADATA = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: {
    id: "gemini",
    name: "Google Gemini",
    logoUrl: "/ai-models/gemini.svg",
    isDefault: true,
  },
  [LLM_PROVIDERS.OPENAI]: {
    id: "openai",
    name: "OpenAI",
    logoUrl: "/ai-models/openai.svg",
    isDefault: false,
  },
});

const MODELS_REGISTRY = Object.freeze([
  // Gemini Models
  {
    id: "gemini-3.5-flash",
    providerId: LLM_PROVIDERS.GEMINI,
    name: "Gemini 3.5 Flash",
    version: "3.5",
    description: "Fast and versatile model for general tasks.",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["fast", "cost-effective"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    providerId: LLM_PROVIDERS.GEMINI,
    name: "Gemini 3.1 Pro (Preview)",
    version: "3.1 Pro",
    description: "Highly capable model for complex reasoning tasks.",
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["advanced", "reasoning"],
    deprecated: false,
    supportedForAgents: true,
  },

  // OpenAI Models
  {
    id: "gpt-4.1-mini",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-4.1 Mini",
    version: "4.1 Mini",
    description: "Small, fast and cost-effective intelligence model.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["fast", "efficient"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "gpt-5.1",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-5.1",
    version: "5.1",
    description: "Advanced intelligence model.",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["advanced"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "gpt-5.4",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-5.4",
    version: "5.4",
    description: "Advanced intelligence model.",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["advanced"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "gpt-5.4-mini",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-5.4 Mini",
    version: "5.4 Mini",
    description: "Small, fast and cost-effective advanced intelligence model.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["fast", "efficient"],
    deprecated: false,
    supportedForAgents: true,
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
      name: providerMeta.name,
      isDefault: providerMeta.isDefault,
      logoUrl: providerMeta.logoUrl,
      models: providerModels,
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
  LLM_PROVIDERS,
  PROVIDERS_METADATA,
  MODELS_REGISTRY,
  getModelEntries,
  getProvidersWithModels,
};
