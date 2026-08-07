const agentsRepository = require("../../repositories/agents.repository");

async function createAgent(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const agent = await agentsRepository.createAgent(userId, req.body);
    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
}

async function getAgents(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const filters = {};
    if (req.query.projectId) filters.projectId = req.query.projectId;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
    if (req.query.search) filters.search = req.query.search;

    const agents = await agentsRepository.getUserAgents(userId, filters);
    res.json(agents);
  } catch (error) {
    next(error);
  }
}

async function getAgentById(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const agent = await agentsRepository.getAgentByIdWithAccess(id, userId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  } catch (error) {
    next(error);
  }
}

async function updateAgent(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const agent = await agentsRepository.updateAgent(id, userId, req.body);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  } catch (error) {
    next(error);
  }
}

async function deleteAgent(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    await agentsRepository.deleteAgent(id, userId);
    res.json({ message: "Agent deleted successfully", success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAgent,
  deleteAgent,
  getAgentById,
  getAgents,
  updateAgent,
};
