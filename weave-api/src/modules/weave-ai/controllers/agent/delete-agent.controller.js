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
    res.json({ message: t.deleteAgentSuccess, success: true });
  } catch (error) {
    if (error.statusCode === 401) {
      return res
        .status(401)
        .json({ error: error.message || t.unauthenticated, success: false });
    }
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: t.deleteAgentFailed, success: false });
  }
}

module.exports = { deleteAgent };
