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
    id: "gemini-3.1-flash-lite",
    providerId: LLM_PROVIDERS.GEMINI,
    name: "Gemini 3.1 Flash Lite",
    version: "3.1 Lite",
    description: "Lightweight and efficient model for simpler tasks.",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    features: ["vision", "system_instructions"],
    tags: ["fast", "efficient"],
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
    id: "gpt-4o",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-4o",
    version: "4o",
    description: "Versatile, high-performance model.",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["versatile"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "gpt-4o-mini",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "GPT-4o Mini",
    version: "4o Mini",
    description: "Small, fast and cost-effective model.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    features: ["vision", "function_calling", "system_instructions"],
    tags: ["fast", "efficient"],
    deprecated: false,
    supportedForAgents: true,
  },
  {
    id: "o3-mini",
    providerId: LLM_PROVIDERS.OPENAI,
    name: "o3 Mini",
    version: "o3 Mini",
    description: "Strong reasoning capabilities for math and coding.",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    features: ["system_instructions"],
    tags: ["reasoning", "coding"],
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
