const agentCustomToolsService = require("../../services/agents/agents-tools.service");
const BaseController = require("../base.controller");

class AgentsToolsController extends BaseController {
  async createCustomTool(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const workspaceId = this._extractWorkspaceId(req);
      const payload = { ...req.body, workspaceId };

      const tool = await agentCustomToolsService.createCustomTool(userId, payload);
      res.status(201).json({ data: tool, success: true });
    } catch (error) {
      next(error);
    }
  }

  async getCustomTools(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const tools = await agentCustomToolsService.listUserCustomTools(userId);
      res.json({ data: tools, success: true });
    } catch (error) {
      next(error);
    }
  }

  async updateCustomTool(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const tool = await agentCustomToolsService.updateCustomTool(id, userId, req.body);
      res.json({ data: tool, success: true });
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomTool(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      await agentCustomToolsService.deleteCustomTool(id, userId);
      res.json({ message: "Custom tool deleted successfully", success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AgentsToolsController();
