/**
 * Normaliza os dados para o formato de agente de IA
 * @param {object} data - Dados de entrada
 * @returns {object} JSON estruturado para o agente
 */
function ensureArrayField(value) {
  if (Array.isArray(value)) {
    return value.filter(
      (item) => item !== null && item !== undefined && item !== ""
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item !== null && item !== undefined && item !== ""
        );
      }
    } catch (error) {
      // Fallback to comma-separated parsing
    }

    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (!value) return [];
  return [value].filter(Boolean);
}

function normalizeAgentData(data) {
  const {
    name,
    description,
    instructions,
    role,
    tone,
    language = "pt-BR",
    avatar_url,
    tags = [],
    model_provider,
    model_name,
    tools = [],
  } = data;

  return {
    persona: {
      role: role || name,
      tone: tone || "helpful",
      language: language,
      avatar_url: avatar_url || "",
    },
    // agent_id será gerado pelo banco ou pode ser passado se for update
    behavior: {
      guardrails: {
        denied_topics: [],
        content_filters: {
          pii_leak: "block",
          hate_speech: "block",
          prompt_injection: "block",
        },
      },
      system_instructions: {
        rules: [],
        context: instructions || "",
        objectives: [],
      },
    },
    metadata: {
      name: name,
      tags: ensureArrayField(tags),
      version: "1.0.0",
      description: description,
      // created_at e updated_at são gerenciados pelo banco
    },
    capabilities: {
      tools: ensureArrayField(tools),
      knowledge_base: {
        enabled: false,
        sources: [],
        strategy: "similarity",
        rag_threshold: 0.7,
      },
    },
    model_config: {
      top_k: 40,
      top_p: 0.95,
      provider: model_provider,
      model_name: model_name,
      temperature: 0.7,
      response_format: "text",
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_output_tokens: 2048,
    },
    shredWith: {
      enabled: false,
      strategy: "text_split",
      chunk_size: 500,
      chunk_overlap: 50,
    },
  };
}

function formatAgentResponse(agentRow = {}) {
  if (!agentRow) return null;

  const personality = agentRow.personality || {};
  const persona = personality.persona || {};
  const behavior = personality.behavior || {};
  const metadata = personality.metadata || {};
  const capabilities = personality.capabilities || {};
  const modelConfig = personality.model_config || {};

  let knowledgeFiles = agentRow.knowledge_files;
  if (typeof knowledgeFiles === "string") {
    try {
      knowledgeFiles = JSON.parse(knowledgeFiles);
    } catch (error) {
      knowledgeFiles = null;
    }
  }

  if (!Array.isArray(knowledgeFiles)) {
    knowledgeFiles = capabilities.knowledge_base?.sources || [];
  }

  return {
    id: agentRow.id,
    name: metadata.name || "",
    description: metadata.description || "",
    instructions: behavior.system_instructions?.context || "",
    role: persona.role || "",
    tone: persona.tone || "",
    language: persona.language || "pt-BR",
    avatar_url: persona.avatar_url || "",
    tags: metadata.tags || [],
    tools: capabilities.tools || [],
    model_provider: modelConfig.provider || "",
    model_name: modelConfig.model_name || "",
    knowledge_files: knowledgeFiles,
    is_public: agentRow.is_public || false,
    user_id: agentRow.user_id,
    created_at: agentRow.created_at,
    updated_at: agentRow.updated_at,
  };
}

function mergeAgentUpdates(existingPersonality = {}, updates = {}) {
  const next = JSON.parse(JSON.stringify(existingPersonality || {}));

  next.persona = next.persona || {};
  next.behavior = next.behavior || {};
  next.behavior.system_instructions = next.behavior.system_instructions || {};
  next.metadata = next.metadata || {};
  next.capabilities = next.capabilities || {};
  next.model_config = next.model_config || {};
  next.capabilities.knowledge_base = next.capabilities.knowledge_base || {
    enabled: false,
    sources: [],
    strategy: "similarity",
    rag_threshold: 0.7,
  };

  if (updates.name !== undefined) next.metadata.name = updates.name;
  if (updates.description !== undefined)
    next.metadata.description = updates.description;
  if (updates.instructions !== undefined)
    next.behavior.system_instructions.context = updates.instructions;
  if (updates.role !== undefined) next.persona.role = updates.role;
  if (updates.tone !== undefined) next.persona.tone = updates.tone;
  if (updates.language !== undefined) next.persona.language = updates.language;
  if (updates.avatar_url !== undefined)
    next.persona.avatar_url = updates.avatar_url;
  if (updates.tags !== undefined)
    next.metadata.tags = ensureArrayField(updates.tags);
  if (updates.tools !== undefined)
    next.capabilities.tools = ensureArrayField(updates.tools);
  if (updates.model_provider !== undefined)
    next.model_config.provider = updates.model_provider;
  if (updates.model_name !== undefined)
    next.model_config.model_name = updates.model_name;

  return next;
}

module.exports = {
  normalizeAgentData,
  formatAgentResponse,
  mergeAgentUpdates,
  ensureArrayField,
};
