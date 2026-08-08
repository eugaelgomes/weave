const { pool } = require("../../../database/connection");

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
        name: m.provider_name,
        models: [],
      };
    }
    
    providersMap[m.provider_id].models.push({
      id: m.identifier,
      name: m.name,
      providerId: m.provider_id,
      version: m.version,
      description: m.description,
      contextWindow: m.context_window,
      maxOutputTokens: m.max_output_tokens,
      supportedForAgents: m.supported_for_agents,
      features: m.features || [],
      tags: m.tags || [],
      reasoningLevels: m.reasoning_levels || ["none"],
      deprecated: m.deprecated,
    });
  }

  return Object.values(providersMap);
}

/**
 * @param {string} provider
 * @returns {Promise<Array<any>>}
 */
async function getModelEntries(provider) {
  const result = await pool.query(
    "SELECT * FROM ai_llm_models WHERE provider_id = $1",
    [provider]
  );
  return result.rows.map((m) => ({
    id: m.identifier,
    name: m.name,
    providerId: m.provider_id,
    version: m.version,
    description: m.description,
    contextWindow: m.context_window,
    maxOutputTokens: m.max_output_tokens,
    supportedForAgents: m.supported_for_agents,
    features: m.features || [],
    tags: m.tags || [],
    reasoningLevels: m.reasoning_levels || ["none"],
    deprecated: m.deprecated,
  }));
}

module.exports = {
  getModelEntries,
  getProvidersWithModels,
};
