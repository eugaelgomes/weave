const agentCustomToolsService = require("../services/agent-custom-tools.service");

async function createCustomTool(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const organizationId =
      req.user.organizationId ||
      req.user.current_organization_id ||
      req.body.organizationId ||
      null;
    const payload = { ...req.body, organizationId };

    const tool = await agentCustomToolsService.createCustomTool(userId, payload);
    res.status(201).json(tool);
  } catch (error) {
    next(error);
  }
}

async function getCustomTools(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const tools = await agentCustomToolsService.listUserCustomTools(userId);
    res.json(tools);
  } catch (error) {
    next(error);
  }
}

async function updateCustomTool(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const tool = await agentCustomToolsService.updateCustomTool(id, userId, req.body);
    res.json(tool);
  } catch (error) {
    next(error);
  }
}

async function deleteCustomTool(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    await agentCustomToolsService.deleteCustomTool(id, userId);
    res.json({ message: "Custom tool deleted successfully", success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCustomTool,
  deleteCustomTool,
  getCustomTools,
  updateCustomTool,
};
