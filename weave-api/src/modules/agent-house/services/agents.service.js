const agentsRepository = require("../repositories/agents.repository");

class AgentsService {
  async createAgent(userId, data) {
    return agentsRepository.createAgent(userId, data);
  }

  async listUserAgents(userId, filters = {}) {
    return agentsRepository.getUserAgents(userId, filters);
  }

  async getAgentById(agentId, userId) {
    return agentsRepository.getAgentByIdWithAccess(agentId, userId);
  }

  async updateAgent(agentId, userId, updates) {
    return agentsRepository.updateAgent(agentId, userId, updates);
  }

  async deleteAgent(agentId, userId) {
    return agentsRepository.deleteAgent(agentId, userId);
  }
}

module.exports = new AgentsService();
