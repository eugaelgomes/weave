const agentLlmsService = require("../services/agent-llms.service");

async function createLlmConfig(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const workspaceId =
      req.user.workspaceId || req.user.current_workspace_id || req.body.workspaceId || null;
    const payload = { ...req.body, workspaceId };

    const config = await agentLlmsService.createLlmConfig(userId, payload);
    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
}

async function getLlmConfigs(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const configs = await agentLlmsService.listUserLlmConfigs(userId);
    res.json(configs);
  } catch (error) {
    next(error);
  }
}

async function updateLlmConfig(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const config = await agentLlmsService.updateLlmConfig(id, userId, req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

async function deleteLlmConfig(req, res, next) {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    await agentLlmsService.deleteLlmConfig(id, userId);
    res.json({ message: "LLM configuration deleted successfully", success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLlmConfig,
  deleteLlmConfig,
  getLlmConfigs,
  updateLlmConfig,
};
