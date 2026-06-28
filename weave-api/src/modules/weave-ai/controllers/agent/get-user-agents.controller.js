const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { formatAgentResponse } = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function getUserAgents(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const filters = {};
    if (req.query.projectId) filters.projectId = req.query.projectId;
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === "true";
    if (req.query.search) filters.search = req.query.search;

    const rawAgents = await agentRepository.getUserAgents(userId, filters);
    const agents = rawAgents.map((agent) => formatAgentResponse(agent));

    res.json({ success: true, agents });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error fetching agents:", error);
    res.status(500).json({ success: false, error: t.fetchAgentsFailed });
  }
}

module.exports = { getUserAgents };