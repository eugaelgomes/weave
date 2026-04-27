const LLM_PROVIDERS = Object.freeze({
  GEMINI: "gemini",
  OPENAI: "openai",
});

const LLM_PROVIDER_LOGOS = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: "/ai-models/gemini.svg",
  [LLM_PROVIDERS.OPENAI]: "/ai-models/openai.svg",
});

const LLM_MODELS = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: Object.freeze({
    PRO: "gemini-3.1-pro-preview",
  }),
  [LLM_PROVIDERS.OPENAI]: Object.freeze({
    DEFAULT: "gpt-5.4",
    LEGACY: "gpt-4o",
    LIGHT: "gpt-4o-mini",
    REASONING: "o3-mini",
  }),
});

/**
 * @param {string} provider
 * @returns {Array<{ key: string, version: string, logoUrl: string|null }>}
 */
function getModelEntries(provider) {
  const providerModels = LLM_MODELS[provider] || {};
  return Object.entries(providerModels).map(([key, version]) => ({
    key,
    logoUrl: LLM_PROVIDER_LOGOS[provider] || null,
    version,
  }));
}

/**
 * @returns {Array<{
 *   name: string,
 *   logoUrl: string|null,
 *   models: Record<string, string>,
 *   modelEntries: Array<{ key: string, version: string, logoUrl: string|null }>
 * }>}
 */
function getProvidersWithModels() {
  return Object.values(LLM_PROVIDERS).map((provider) => ({
    logoUrl: LLM_PROVIDER_LOGOS[provider] || null,
    modelEntries: getModelEntries(provider),
    name: provider,
    models: LLM_MODELS[provider] || {},
  }));
}

module.exports = {
  LLM_MODELS,
  LLM_PROVIDER_LOGOS,
  LLM_PROVIDERS,
  getModelEntries,
  getProvidersWithModels,
};
