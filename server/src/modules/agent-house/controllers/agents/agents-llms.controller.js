const agentLlmsService = require("../../services/agents/agents-llms.service");
const { getProvidersWithModels } = require("../../services/agents/agents-llm-catalog.service");
const { getI18n, getLangFromReq } = require("../../utils/agent-house-i18n.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const BaseController = require("../base.controller");

class AgentsLLMsController extends BaseController {
  async createLlmConfig(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const workspaceId = this._extractWorkspaceId(req);
      const payload = { ...req.body, workspaceId };

      const config = await agentLlmsService.createLlmConfig(userId, payload);
      res.status(201).json({ data: config, success: true });
    } catch (error) {
      next(error);
    }
  }

  async getLlmConfigs(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const configs = await agentLlmsService.listUserLlmConfigs(userId);
      res.json({ data: configs, success: true });
    } catch (error) {
      next(error);
    }
  }

  async updateLlmConfig(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      const config = await agentLlmsService.updateLlmConfig(id, userId, req.body);
      res.json({ data: config, success: true });
    } catch (error) {
      next(error);
    }
  }

  async deleteLlmConfig(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);
      const { id } = req.params;
      await agentLlmsService.deleteLlmConfig(id, userId);
      res.json({ message: "LLM configuration deleted successfully", success: true });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableModels(req, res) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    try {
      const isAgentCall = req.query.agent === "true";
      const includeDeprecations = req.query.include_deprecations === "true";
      const allProviders = await getProvidersWithModels();

      let availableModels = allProviders.map((provider) => ({
        id: provider.id,
        isDefault: provider.isDefault,
        logoUrl: provider.logoUrl,
        models: provider.models
          .filter((model) => {
            if (isAgentCall) return model.supportedForAgents !== false;
            return true;
          })
          .map((model) => ({
            contextWindow: model.contextWindow,
            deprecated: model.deprecated,
            description: model.description,
            features: model.features,
            id: model.id,
            maxOutputTokens: model.maxOutputTokens,
            name: model.name,
            tags: model.tags,
            version: model.version,
          })),
        name: provider.name,
      }));

      if (!includeDeprecations) {
        availableModels = availableModels.map((provider) => ({
          ...provider,
          models: provider.models.filter((model) => !model.deprecated),
        }));
      }

      return res.json({ providers: availableModels, success: true });
    } catch (error) {
      const normalizedError = chatFormatterUtil.normalizeApiError(error, {
        code: "MODELS_FETCH_FAILED",
        message: t.modelsFetchFailed,
        statusCode: 500,
      });
      console.error("[agent-house/llms] models fetch failed", {
        error: normalizedError,
      });
      return res.status(normalizedError.statusCode).json({
        error: { code: normalizedError.code, message: normalizedError.message },
        success: false,
      });
    }
  }
}

module.exports = new AgentsLLMsController();
