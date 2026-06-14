/**
 * @module weave-ai/utils/normalize
 * @description Provides normalization functions specifically for Agent personalities and responses.
 *
 * Dependencies:
 * - None
 *
 * Used by:
 * - `weave-ai/controllers/agents.controller.js`: To sanitize input and format DB agent models to API shapes.
 * - `weave-ai/repositories/agents.repository.js`: (Indirectly) ensures data consistency.
 */
/**
 * Safely parses array-like payload fields from multipart/body values.
 *
 * @param {unknown} value
 * @returns {Array}
 */
function ensureArrayField(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "null") {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Builds normalized personality payload used by ai_user_agent.
 * Note: `name` and `description` are now first-class columns in the table,
 * NOT stored inside personality. This only builds the JSONB personality blob.
 *
 * @param {object} input
 * @returns {object}
 */
function normalizeAgentPersonality(input = {}) {
  const tools = ensureArrayField(input.tools);
  const tags = ensureArrayField(input.tags);

  return {
    behavior: {
      system_instructions: {
        context: input.instructions || "",
        rules: ensureArrayField(input.rules),
      },
    },
    capabilities: {
      knowledge_base: {
        enabled: false,
        rag_threshold: 0.7,
        sources: [],
        strategy: "similarity",
      },
      tools,
    },
    metadata: {
      avatar_url: input.avatar_url || null,
      model_name: input.model_name || "",
      model_provider: input.model_provider || "",
      tags,
    },
    persona: {
      language: input.language || "pt-BR",
      role: input.role || "",
      tone: input.tone || "professional",
    },
  };
}

/**
 * Merge partial updates into existing personality object.
 * Only touches fields that belong inside the JSONB personality blob.
 *
 * @param {object} currentPersonality
 * @param {object} updates
 * @returns {object}
 */
function mergePersonalityUpdates(currentPersonality = {}, updates = {}) {
  const base = {
    ...normalizeAgentPersonality({}),
    ...currentPersonality,
  };

  const next = {
    ...base,
    behavior: {
      ...base.behavior,
      system_instructions: {
        ...(base.behavior?.system_instructions || {}),
      },
    },
    capabilities: {
      ...base.capabilities,
      knowledge_base: {
        ...(base.capabilities?.knowledge_base || {}),
      },
    },
    metadata: {
      ...(base.metadata || {}),
    },
    persona: {
      ...(base.persona || {}),
    },
  };

  if (updates.instructions !== undefined) {
    next.behavior.system_instructions.context = updates.instructions || "";
  }
  if (updates.rules !== undefined) {
    next.behavior.system_instructions.rules = ensureArrayField(updates.rules);
  }
  if (updates.avatar_url !== undefined) {
    next.metadata.avatar_url = updates.avatar_url || null;
  }
  if (updates.model_provider !== undefined) {
    next.metadata.model_provider = updates.model_provider || "";
  }
  if (updates.model_name !== undefined) {
    next.metadata.model_name = updates.model_name || "";
  }
  if (updates.tags !== undefined) {
    next.metadata.tags = ensureArrayField(updates.tags);
  }
  if (updates.tools !== undefined) {
    next.capabilities.tools = ensureArrayField(updates.tools);
  }
  if (updates.role !== undefined) {
    next.persona.role = updates.role || "";
  }
  if (updates.tone !== undefined) {
    next.persona.tone = updates.tone || "professional";
  }
  if (updates.language !== undefined) {
    next.persona.language = updates.language || "pt-BR";
  }

  return next;
}

/**
 * Serializes db row into API response shape.
 * Surfaces first-class columns (name, description, project_id, is_active)
 * alongside the personality JSONB blob.
 *
 * @param {object} rawAgent
 * @returns {object|null}
 */
function formatAgentResponse(rawAgent) {
  if (!rawAgent) {
    return null;
  }

  const personality =
    rawAgent.personality && typeof rawAgent.personality === "string"
      ? safeJsonParse(rawAgent.personality, {})
      : rawAgent.personality || {};
  const knowledgeFiles =
    rawAgent.knowledge_files && typeof rawAgent.knowledge_files === "string"
      ? safeJsonParse(rawAgent.knowledge_files, [])
      : rawAgent.knowledge_files || [];
  const sharedWith =
    rawAgent.shared_with && typeof rawAgent.shared_with === "string"
      ? safeJsonParse(rawAgent.shared_with, [])
      : rawAgent.shared_with || [];

  return {
    id: rawAgent.id,
    user_id: rawAgent.user_id,
    name: rawAgent.name || personality?.metadata?.name || "Unnamed Agent",
    description:
      rawAgent.description || personality?.metadata?.description || null,
    project_id: rawAgent.project_id || null,
    project_title: rawAgent.project_title || null,
    is_active: rawAgent.is_active !== false,
    personality,
    knowledge_files: knowledgeFiles,
    shared_with: sharedWith,
    created_at: rawAgent.created_at,
    updated_at: rawAgent.updated_at,
  };
}

/**
 * @param {string} value
 * @param {any} fallback
 * @returns {any}
 */
function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  ensureArrayField,
  formatAgentResponse,
  mergePersonalityUpdates,
  normalizeAgentPersonality,
};
