const { pool } = require("@/database/connection");

/**
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   isDefault: boolean,
 *   logoUrl: string|null,
 *   models: Array<any>
 * }>>}
 */
async function getProvidersWithModels() {
  const result = await pool.query(
    "SELECT * FROM ai_llm_models WHERE deprecated = false AND supported_for_agents = true ORDER BY name ASC"
  );
  const models = result.rows;

  // Agrupar por provider_id
  const providersMap = {};
  for (const m of models) {
    if (!providersMap[m.provider_id]) {
      providersMap[m.provider_id] = {
        id: m.provider_id,
        isDefault: m.provider_id === "gemini", // Pode ser movido pro banco futuramente se precisar
        logoUrl: m.logo_url,
        models: [],
        name: m.provider_name,
      };
    }

    providersMap[m.provider_id].models.push({
      contextWindow: m.context_window,
      deprecated: m.deprecated,
      description: m.description,
      features: m.features || [],
      id: m.identifier,
      maxOutputTokens: m.max_output_tokens,
      name: m.name,
      providerId: m.provider_id,
      reasoningLevels: m.reasoning_levels || ["none"],
      supportedForAgents: m.supported_for_agents,
      tags: m.tags || [],
      version: m.version,
    });
  }

  return Object.values(providersMap);
}

/**
 * @param {string} provider
 * @returns {Promise<Array<any>>}
 */
async function getModelEntries(provider) {
  const result = await pool.query("SELECT * FROM ai_llm_models WHERE provider_id = $1", [provider]);
  return result.rows.map((m) => ({
    contextWindow: m.context_window,
    deprecated: m.deprecated,
    description: m.description,
    features: m.features || [],
    id: m.identifier,
    maxOutputTokens: m.max_output_tokens,
    name: m.name,
    providerId: m.provider_id,
    reasoningLevels: m.reasoning_levels || ["none"],
    supportedForAgents: m.supported_for_agents,
    tags: m.tags || [],
    version: m.version,
  }));
}

module.exports = {
  getModelEntries,
  getProvidersWithModels,
};
