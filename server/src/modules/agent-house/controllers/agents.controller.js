const agentsService = require("../services/agents.service");
const { AppError } = require("@/errors");
const agentsRepository = require("../repositories/agents.repository");

class AgentsController {
  _validateAuthentication(req) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw AppError.unauthorized("Authentication required");
    }
    return userId;
  }

  async createAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const agent = await agentsService.createAgent(userId, req.body);
      res.status(201).json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }

  async getAgents(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const filters = {};
      if (req.query.teamId) filters.teamId = req.query.teamId;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
      if (req.query.search) filters.search = req.query.search;

      const agents = await agentsService.listUserAgents(userId, filters);
      res.json({ data: agents, success: true });
    } catch (error) {
      next(error);
    }
  }

  async getAgentById(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const agent = await agentsService.getAgentById(id, userId);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }

  async updateAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const agent = await agentsService.updateAgent(id, userId, req.body);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      await agentsService.deleteAgent(id, userId);
      res.json({ message: "Agent deleted successfully", success: true });
    } catch (error) {
      next(error);
    }
  }

  async duplicateAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const agent = await agentsRepository.duplicateAgent(id, userId);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }

  async shareAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { sharedWith } = req.body;
      const agent = await agentsRepository.shareAgent(id, userId, sharedWith);
      if (!agent) {
        throw AppError.notFound("Agent not found or you don't have permission");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }

  async toggleActive(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const { isActive } = req.body;
      const agent = await agentsRepository.toggleActive(id, userId, isActive);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AgentsController();
