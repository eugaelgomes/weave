/* eslint-disable sort-keys */
const LLM_PROVIDERS = Object.freeze({
  GEMINI: "gemini",
  OPENAI: "openai",
});

const LLM_PROVIDER_LOGOS = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: "/ai-models/gemini.svg",
  [LLM_PROVIDERS.OPENAI]: "/ai-models/openai.svg",
});

/**
 * @typedef {object} LLMModelEntry
 * @property {string} id         - Unique model identifier (same as version string)
 * @property {string} name       - Human-readable label
 * @property {string} version    - API model string
 * @property {number|null} contextWindow
 * @property {string[]} features
 * @property {string[]} tags
 * @property {boolean} deprecated
 * @property {boolean} supportedForAgents
 */

/** @type {Record<string, LLMModelEntry[]>} */
const LLM_MODEL_CATALOG = Object.freeze({
  [LLM_PROVIDERS.GEMINI]: [
    {
      id: "gemini-2.5-flash-preview",
      name: "Gemini 2.5 Flash",
      version: "gemini-2.5-flash-preview-05-20",
      contextWindow: 1_000_000,
      features: ["vision", "function_calling", "json_mode"],
      tags: ["fast", "recommended"],
      deprecated: false,
      supportedForAgents: true,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      version: "gemini-2.0-flash",
      contextWindow: 1_000_000,
      features: ["vision", "function_calling", "json_mode"],
      tags: ["fast"],
      deprecated: false,
      supportedForAgents: true,
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      version: "gemini-1.5-pro",
      contextWindow: 2_000_000,
      features: ["vision", "function_calling", "json_mode"],
      tags: ["powerful"],
      deprecated: false,
      supportedForAgents: true,
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      version: "gemini-1.5-flash",
      contextWindow: 1_000_000,
      features: ["vision", "function_calling", "json_mode"],
      tags: ["legacy"],
      deprecated: true,
      supportedForAgents: false,
    },
  ],
  [LLM_PROVIDERS.OPENAI]: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      version: "gpt-4o",
      contextWindow: 128_000,
      features: ["vision", "function_calling", "json_mode"],
      tags: ["recommended"],
      deprecated: false,
      supportedForAgents: true,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      version: "gpt-4o-mini",
      contextWindow: 128_000,
      features: ["function_calling", "json_mode"],
      tags: ["fast", "cheap"],
      deprecated: false,
      supportedForAgents: true,
    },
    {
      id: "o3-mini",
      name: "o3-mini",
      version: "o3-mini",
      contextWindow: 200_000,
      features: ["function_calling"],
      tags: ["reasoning"],
      deprecated: false,
      supportedForAgents: false,
    },
  ],
});

/**
 * Returns a flat list of all model entries for a given provider.
 * @param {string} provider
 * @returns {LLMModelEntry[]}
 */
function getModelEntries(provider) {
  return LLM_MODEL_CATALOG[provider] || [];
}

/**
 * Returns providers enriched with their model arrays.
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   isDefault: boolean,
 *   logoUrl: string|null,
 *   models: LLMModelEntry[]
 * }>}
 */
function getProvidersWithModels() {
  return Object.values(LLM_PROVIDERS).map((provider, index) => ({
    id: provider,
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    isDefault: index === 0,
    logoUrl: LLM_PROVIDER_LOGOS[provider] || null,
    models: getModelEntries(provider),
  }));
}

module.exports = {
  LLM_MODEL_CATALOG,
  LLM_PROVIDER_LOGOS,
  LLM_PROVIDERS,
  getModelEntries,
  getProvidersWithModels,
};
