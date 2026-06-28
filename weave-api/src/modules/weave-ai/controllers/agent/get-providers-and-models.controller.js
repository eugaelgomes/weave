const { getProvidersWithModels } = require("@/modules/weave-ai/llm-catalog");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function getProvidersAndModels(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    validateAuthentication(req);
    const providers = getProvidersWithModels();
    res.json({ status: "OK", providers });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error fetching providers and models:", error);
    res.status(500).json({ success: false, error: t.fetchProvidersFailed });
  }
}

module.exports = { getProvidersAndModels };