const express = require("express");

// Chat Controllers
const chatEngineController = require("./controllers/chat/chat-engine.controller");
const chatSessionsController = require("./controllers/chat/chat-sessions.controller");
const chatSharingController = require("./controllers/chat/chat-sharing.controller");

// Agent House Controllers
const agentLlmsController = require("./controllers/agents/agents-llms.controller");
const agentCustomToolsController = require("./controllers/agents/agents-tools.controller");
const agentsController = require("./controllers/agents/agents-management.controller");
const artifactsController = require("./controllers/artifacts/artifacts.controller");

const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const { requireOrgPermission } = require("@/middlewares/auth/require-org-permission");
const { validate } = require("@/middlewares/validation/validate");
const {
  chatPayloadSchema,
  submitFeedbackSchema,
  getChatHistorySchema,
  createUserAgentSchema,
  updateAgentSchema,
} = require("./schemas/agent-house.schema");
const {
  createLlmSchema,
  updateLlmSchema,
  createCustomToolSchema,
  updateCustomToolSchema,
} = require("./schemas/agent-house.schema");
const { ORG_PERMISSIONS } = require("@/modules/workspaces/workspace-role-policy");
const { strictLimiter } = require("@/middlewares/security/request-limiters");
const { handleChatFilesUpload } = require("./utils/chat-upload.util");

const router = express.Router();

const requireManageWeaveAi = requireOrgPermission(ORG_PERMISSIONS.MANAGE_WEAVE_AI);

router.use(verifyToken, strictLimiter);
const { requireModule } = require("@/middlewares/auth/require-module");
router.use(requireModule("agent_house"));
router.use((req, res, next) => {
  if (req.path.startsWith("/chat") || req.path.startsWith("/models")) {
    return requireScope("ai:chat")(req, res, next);
  }
  if (req.path.startsWith("/agents")) {
    return requireScope("ai:agents")(req, res, next);
  }
  return next();
});

// Chat endpoints
router.post("/chat", handleChatFilesUpload, validate(chatPayloadSchema, "body"), (req, res, next) =>
  chatEngineController.chat(req, res, next)
);
router.get("/chat/history", validate(getChatHistorySchema, "query"), (req, res, next) =>
  chatSessionsController.getChatHistory(req, res, next)
);
router.delete("/chat/:sessionId", (req, res, next) =>
  chatSessionsController.deleteChatSession(req, res, next)
);
router.post(
  "/chat/messages/:messageId/feedback",
  validate(submitFeedbackSchema, "body"),
  (req, res, next) => chatSessionsController.submitFeedback(req, res, next)
);
router.post("/chat/:sessionId/share", (req, res, next) =>
  chatSharingController.shareChatSession(req, res, next)
);
router.get("/chat/share/:token", (req, res, next) =>
  chatSharingController.getSharedChatPreview(req, res, next)
);
router.post("/chat/share/:token/fork", (req, res, next) =>
  chatSharingController.forkSharedChat(req, res, next)
);

router.get("/models", (req, res, next) => agentLlmsController.getAvailableModels(req, res, next));

// Agent House - Agents
router.post(
  "/agents",
  requireManageWeaveAi,
  validate(createUserAgentSchema, "body"),
  (req, res, next) => agentsController.createAgent(req, res, next)
);
router.get("/agents", (req, res, next) => agentsController.getAgents(req, res, next));
router.get("/agents/providers", (req, res, next) =>
  agentLlmsController.getAvailableModels(req, res, next)
);
router.get("/agents/:id", (req, res, next) => agentsController.getAgentById(req, res, next));
router.put(
  "/agents/:id",
  requireManageWeaveAi,
  validate(updateAgentSchema, "body"),
  (req, res, next) => agentsController.updateAgent(req, res, next)
);
router.delete("/agents/:id", requireManageWeaveAi, (req, res, next) =>
  agentsController.deleteAgent(req, res, next)
);
router.post("/agents/:id/duplicate", requireManageWeaveAi, (req, res, next) =>
  agentsController.duplicateAgent(req, res, next)
);
router.put("/agents/:id/share", requireManageWeaveAi, (req, res, next) =>
  agentsController.shareAgent(req, res, next)
);
router.patch("/agents/:id/toggle", requireManageWeaveAi, (req, res, next) =>
  agentsController.toggleActive(req, res, next)
);

// Agent House - LLMs
router.post(
  "/agents/llms",
  requireManageWeaveAi,
  validate(createLlmSchema, "body"),
  (req, res, next) => agentLlmsController.createLlmConfig(req, res, next)
);
router.get("/agents/llms", (req, res, next) => agentLlmsController.getLlmConfigs(req, res, next));
router.put(
  "/agents/llms/:id",
  requireManageWeaveAi,
  validate(updateLlmSchema, "body"),
  (req, res, next) => agentLlmsController.updateLlmConfig(req, res, next)
);
router.delete("/agents/llms/:id", requireManageWeaveAi, (req, res, next) =>
  agentLlmsController.deleteLlmConfig(req, res, next)
);

// Agent House - Custom Tools
router.post(
  "/agents/tools",
  requireManageWeaveAi,
  validate(createCustomToolSchema, "body"),
  (req, res, next) => agentCustomToolsController.createCustomTool(req, res, next)
);
router.get("/agents/tools", (req, res, next) =>
  agentCustomToolsController.getCustomTools(req, res, next)
);
router.put(
  "/agents/tools/:id",
  requireManageWeaveAi,
  validate(updateCustomToolSchema, "body"),
  (req, res, next) => agentCustomToolsController.updateCustomTool(req, res, next)
);
router.delete("/agents/tools/:id", requireManageWeaveAi, (req, res, next) =>
  agentCustomToolsController.deleteCustomTool(req, res, next)
);

// Agent House - Artifacts
router.post("/artifacts", (req, res, next) => artifactsController.createArtifact(req, res, next));
router.get("/artifacts/:id", (req, res, next) => artifactsController.getArtifact(req, res, next));
router.patch("/artifacts/:id", (req, res, next) =>
  artifactsController.updateArtifact(req, res, next)
);

module.exports = router;
