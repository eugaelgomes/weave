const agentRepository = require("@/modules/weave-ai/repositories/agents.repository");
const {
  normalizeAgentPersonality,
  formatAgentResponse,
} = require("@/modules/weave-ai/utils/normalize");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");
const {
  validateAuthentication,
  processKnowledgeFileUploads,
} = require("./agent.helpers");

async function createUserAgent(req, res) {
  const userLanguage = getLangFromReq(req);
  const t = getI18n(userLanguage);
  try {
    const userId = validateAuthentication(req);
    const {
      name,
      description,
      instructions,
      role,
      tone,
      language,
      avatar_url,
      tags,
      model_provider,
      model_name,
      tools,
      rules,
      project_id,
    } = req.body;

    const personality = normalizeAgentPersonality({
      avatar_url,
      instructions,
      language,
      model_name,
      model_provider,
      role,
      rules: rules
        ? typeof rules === "string"
          ? JSON.parse(rules)
          : rules
        : [],
      tags: tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [],
      tone,
      tools: tools
        ? typeof tools === "string"
          ? JSON.parse(tools)
          : tools
        : [],
    });

    if (req.files && req.files.length > 0) {
      const knowledgeFiles = await processKnowledgeFileUploads(
        req.files,
        userId
      );
      personality.capabilities.knowledge_base.enabled = true;
      personality.capabilities.knowledge_base.sources = knowledgeFiles;
    }

    const newAgent = await agentRepository.createAgent(userId, {
      description: description || null,
      isActive: true,
      name,
      personality,
      projectId: project_id || null,
    });

    res.json({ agent: formatAgentResponse(newAgent), success: true });
  } catch (error) {
    if (error.statusCode === 401) {
      return res
        .status(401)
        .json({ error: error.message || t.unauthenticated, success: false });
    }
    console.error("Error creating agent:", error);
    res.status(500).json({ error: t.createAgentFailed, success: false });
  }
}

module.exports = { createUserAgent };
