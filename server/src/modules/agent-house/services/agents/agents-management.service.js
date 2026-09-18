const agentsRepository = require("../../repositories/agents/agents-management.repository");

class AgentsManagementService {
  _parseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _buildPersonality({
    instructions,
    instructions_document,
    role,
    tone,
    rules,
    language,
    tags,
    avatar_url,
    tools,
    model_provider,
    model_name,
  }) {
    return {
      avatar_url: avatar_url || null,
      instructions: instructions || null,
      instructions_document: Array.isArray(instructions_document) ? instructions_document : [],
      language: language || "pt-BR",
      model_name: model_name || "",
      model_provider: model_provider || "",
      role: role || null,
      rules: Array.isArray(rules) ? rules : rules ? [rules] : [],
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      tone: tone || "professional",
      tools: this._parseArray(tools),
    };
  }

  async createAgent(userId, data) {
    const personality = this._buildPersonality(data);
    const agentData = {
      description: data.description,
      isActive: data.is_active,
      name: data.name,
      personality,
      teamId: data.team_id,
    };
    return agentsRepository.createAgent(userId, agentData);
  }

  async listUserAgents(userId, filters = {}) {
    return agentsRepository.getUserAgents(userId, filters);
  }

  async getAgentById(agentId, userId) {
    return agentsRepository.getAgentByIdWithAccess(agentId, userId);
  }

  async updateAgent(agentId, userId, updates) {
    const updateData = { ...updates };

    // If any personality-related fields are updated, we need to rebuild the personality
    if (
      updates.instructions !== undefined ||
      updates.instructions_document !== undefined ||
      updates.role !== undefined ||
      updates.tone !== undefined ||
      updates.rules !== undefined ||
      updates.language !== undefined ||
      updates.tags !== undefined ||
      updates.avatar_url !== undefined ||
      updates.tools !== undefined ||
      updates.model_provider !== undefined ||
      updates.model_name !== undefined
    ) {
      const currentAgent = await agentsRepository.getAgentByIdWithAccess(agentId, userId);
      if (currentAgent) {
        const currentPersonality = currentAgent.personality || {};
        updateData.personality = this._buildPersonality({
          ...currentPersonality,
          ...updates,
        });
      }
    }

    return agentsRepository.updateAgent(agentId, userId, updateData);
  }

  async deleteAgent(agentId, userId) {
    return agentsRepository.deleteAgent(agentId, userId);
  }
}

module.exports = new AgentsManagementService();
