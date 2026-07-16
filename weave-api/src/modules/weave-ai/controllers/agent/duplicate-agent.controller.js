const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { formatAgentResponse } = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function duplicateAgent(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const { id } = req.params;

    const duplicated = await agentRepository.duplicateAgent(id, userId);
    if (!duplicated) {
      return res.status(404).json({ error: t.agentNotFound, success: false });
    }
    res.json({ agent: formatAgentResponse(duplicated), success: true });
  } catch (error) {
    if (error.statusCode === 401) {
      return res
        .status(401)
        .json({ error: error.message || t.unauthenticated, success: false });
    }
    console.error("Error duplicating agent:", error);
    res.status(500).json({ error: t.duplicateAgentFailed, success: false });
  }
}

module.exports = { duplicateAgent };
