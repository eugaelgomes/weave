const agentsService = require("../../services/agents/agents-management.service");
const { AppError } = require("@/errors");
const agentsRepository = require("../../repositories/agents/agents-management.repository");
const BaseController = require("../base.controller");

class AgentsManagementController extends BaseController {
  async createAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const agent = await agentsService.createAgent(userId, req.body);
      res.status(201).json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getAgents(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const filters = {};
      if (req.query.teamId) filters.teamId = req.query.teamId;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
      if (req.query.search) filters.search = req.query.search;

      const agents = await agentsService.listUserAgents(userId, filters);
      res.json({ data: agents, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getAgentById(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const { id } = req.params;
      const agent = await agentsService.getAgentById(id, userId);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const { id } = req.params;
      const agent = await agentsService.updateAgent(id, userId, req.body);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async deleteAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const { id } = req.params;
      await agentsService.deleteAgent(id, userId);
      res.json({ message: "Agent deleted successfully", success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async duplicateAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const { id } = req.params;
      const agent = await agentsRepository.duplicateAgent(id, userId);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async shareAgent(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const { id } = req.params;
      const { sharedWith } = req.body;
      const agent = await agentsRepository.shareAgent(id, userId, sharedWith);
      if (!agent) {
        throw AppError.notFound("Agent not found or you don't have permission");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async toggleActive(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      const workspace = await this._getUserWorkspace(userId);
      this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_WEAVE_AI);

      const { id } = req.params;
      const { isActive } = req.body;
      const agent = await agentsRepository.toggleActive(id, userId, isActive);
      if (!agent) {
        throw AppError.notFound("Agent not found");
      }
      res.json({ data: agent, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new AgentsManagementController();
