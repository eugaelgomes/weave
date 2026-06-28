const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");

async function getAvailableModels(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const isAgentCall = req.query.agent === "true";
    const includeDeprecations = req.query.include_deprecations === "true";
    const allProviders = getProvidersWithModels();

    let availableModels = allProviders.map((provider) => ({
      id: provider.id,
      name: provider.name,
      logoUrl: provider.logoUrl,
      isDefault: provider.isDefault,
      models: provider.models
        .filter((model) => {
          if (isAgentCall) return model.supportedForAgents !== false;
          return true;
        })
        .map((model) => ({
          id: model.id,
          name: model.name,
          version: model.version,
          description: model.description,
          contextWindow: model.contextWindow,
          maxOutputTokens: model.maxOutputTokens,
          features: model.features,
          tags: model.tags,
          deprecated: model.deprecated,
        })),
    }));

    if (!includeDeprecations) {
      availableModels = availableModels.map((provider) => ({
        ...provider,
        models: provider.models.filter((model) => !model.deprecated),
      }));
    }

    return res.json({ success: true, providers: availableModels });
  } catch (error) {
    const normalizedError = chatFormatterUtil.normalizeApiError(error, {
      code: "MODELS_FETCH_FAILED",
      message: t.modelsFetchFailed,
      statusCode: 500,
    });
    console.error("[weave-ai/chat] models fetch failed", { error: normalizedError });
    return res.status(normalizedError.statusCode).json({
      success: false,
      error: { code: normalizedError.code, message: normalizedError.message },
    });
  }
}

module.exports = { getAvailableModels };