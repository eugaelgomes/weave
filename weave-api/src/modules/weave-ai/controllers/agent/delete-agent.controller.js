const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function deleteAgent(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const { id } = req.params;

    await agentRepository.deleteAgent(id, userId);
    res.json({ success: true, message: t.deleteAgentSuccess });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error deleting agent:", error);
    res.status(500).json({ success: false, error: t.deleteAgentFailed });
  }
}

module.exports = { deleteAgent };