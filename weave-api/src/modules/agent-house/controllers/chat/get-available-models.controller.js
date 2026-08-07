const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { getProvidersWithModels } = require("@/modules/agent-house/llm-catalog");
const { getI18n, getLangFromReq } = require("../../utils/agent-house-i18n.util");

async function getAvailableModels(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const isAgentCall = req.query.agent === "true";
    const includeDeprecations = req.query.include_deprecations === "true";
    const allProviders = getProvidersWithModels();

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
    console.error("[agent-house/chat] models fetch failed", {
      error: normalizedError,
    });
    return res.status(normalizedError.statusCode).json({
      error: { code: normalizedError.code, message: normalizedError.message },
      success: false,
    });
  }
}

module.exports = { getAvailableModels };
