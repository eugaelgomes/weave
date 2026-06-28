const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { formatAgentResponse } = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function toggleActive(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedAgent = await agentRepository.toggleActive(id, userId, isActive);
    if (!updatedAgent) {
      return res.status(404).json({ success: false, error: t.agentNotFound });
    }
    res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error toggling agent state:", error);
    res.status(500).json({ success: false, error: t.toggleActiveFailed });
  }
}

module.exports = { toggleActive };