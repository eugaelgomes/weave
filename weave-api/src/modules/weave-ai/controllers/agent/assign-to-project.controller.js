const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { formatAgentResponse } = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication } = require("./agent.helpers");

async function assignToProject(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const { id } = req.params;
    const { projectId } = req.body;

    const updatedAgent = await agentRepository.assignToProject(id, userId, projectId);
    if (!updatedAgent) {
      return res.status(404).json({ success: false, error: t.agentNotFound });
    }
    res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error assigning agent to project:", error);
    res.status(500).json({ success: false, error: t.assignProjectFailed });
  }
}

module.exports = { assignToProject };