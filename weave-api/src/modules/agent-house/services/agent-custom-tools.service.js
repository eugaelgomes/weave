const agentCustomToolsRepository = require("../repositories/agent-custom-tools.repository");

class AgentCustomToolsService {
  async createCustomTool(userId, data) {
    if (!data.name || !data.webhookUrl) {
      throw new Error("Missing required fields (name, webhookUrl).");
    }

    // Name must be a valid command string without spaces (e.g., 'send_email', 'get_weather')
    if (!/^[a-zA-Z0-9_]+$/.test(data.name)) {
      throw new Error("Tool name can only contain alphanumeric characters and underscores.");
    }

    return agentCustomToolsRepository.create(userId, data);
  }

  async listUserCustomTools(userId) {
    return agentCustomToolsRepository.findByUserId(userId);
  }

  async getCustomToolById(id, userId) {
    const tool = await agentCustomToolsRepository.findById(id, userId);
    if (!tool) throw new Error("Custom Tool not found.");
    return tool;
  }

  async updateCustomTool(id, userId, updates) {
    if (updates.name && !/^[a-zA-Z0-9_]+$/.test(updates.name)) {
      throw new Error("Tool name can only contain alphanumeric characters and underscores.");
    }

    // Map camelCase to snake_case for repository
    const repoUpdates = { ...updates };
    if (repoUpdates.webhookUrl) {
      repoUpdates.webhook_url = repoUpdates.webhookUrl;
      delete repoUpdates.webhookUrl;
    }
    if (repoUpdates.payloadSchema) {
      repoUpdates.payload_schema = repoUpdates.payloadSchema;
      delete repoUpdates.payloadSchema;
    }

    const result = await agentCustomToolsRepository.update(id, userId, repoUpdates);
    if (!result) throw new Error("Failed to update or not found.");
    return result;
  }

  async deleteCustomTool(id, userId) {
    const result = await agentCustomToolsRepository.delete(id, userId);
    if (!result) throw new Error("Custom Tool not found.");
    return { success: true };
  }
}

module.exports = new AgentCustomToolsService();
