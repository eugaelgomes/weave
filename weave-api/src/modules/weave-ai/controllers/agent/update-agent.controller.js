const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const { formatAgentResponse, mergePersonalityUpdates } = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const { validateAuthentication, processKnowledgeFileUploads, parseKnowledgeFiles } = require("./agent.helpers");

async function updateAgent(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const { id } = req.params;
    const updates = req.body || {};

    const agent = await agentRepository.getAgentById(id, userId);
    if (!agent) {
      return res.status(404).json({ success: false, error: t.agentNotFound });
    }

    const columnUpdates = {};
    if (updates.name !== undefined) columnUpdates.name = updates.name;
    if (updates.description !== undefined) columnUpdates.description = updates.description;
    if (updates.project_id !== undefined) columnUpdates.project_id = updates.project_id || null;
    if (updates.is_active !== undefined) columnUpdates.is_active = updates.is_active;

    const personalityFields = ["instructions", "rules", "role", "tone", "language", "avatar_url", "model_provider", "model_name", "tags", "tools"];
    const personalityUpdates = {};
    personalityFields.forEach((field) => {
      if (updates[field] !== undefined) personalityUpdates[field] = updates[field];
    });

    if (Object.keys(personalityUpdates).length > 0) {
      columnUpdates.personality = mergePersonalityUpdates(agent.personality, personalityUpdates);
    }

    let knowledgeFiles = parseKnowledgeFiles(agent);
    if (req.files && req.files.length > 0) {
      const newFiles = await processKnowledgeFileUploads(req.files, userId);
      knowledgeFiles = [...knowledgeFiles, ...newFiles];
    }

    if (knowledgeFiles.length > 0) {
      const personality = columnUpdates.personality || agent.personality || {};
      personality.capabilities = personality.capabilities || {};
      personality.capabilities.knowledge_base = personality.capabilities.knowledge_base || {
        enabled: false, sources: [], strategy: "similarity", rag_threshold: 0.7,
      };
      personality.capabilities.knowledge_base.sources = knowledgeFiles;
      personality.capabilities.knowledge_base.enabled = true;
      columnUpdates.personality = personality;
      columnUpdates.knowledge_files = JSON.stringify(knowledgeFiles);
    }

    if (Object.keys(columnUpdates).length === 0) {
      return res.json({ success: true, agent: formatAgentResponse(agent) });
    }

    const updatedAgent = await agentRepository.updateAgent(id, userId, columnUpdates);
    res.json({ success: true, agent: formatAgentResponse(updatedAgent) });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: error.message || t.unauthenticated });
    }
    console.error("Error updating agent:", error);
    res.status(500).json({ success: false, error: t.updateAgentFailed });
  }
}

module.exports = { updateAgent };