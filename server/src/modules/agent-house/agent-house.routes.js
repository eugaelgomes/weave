const express = require("express");

const {
  chat,
  getChatHistory,
  deleteChatSession,
  getAvailableModels,
  submitFeedback,
  shareChatSession,
  getSharedChatPreview,
  forkSharedChat,
} = require("./controllers/chat.controller");

// Agent House Controllers
const {
  createLlmConfig,
  getLlmConfigs,
  updateLlmConfig,
  deleteLlmConfig,
} = require("./controllers/agent-llms.controller");
const {
  createCustomTool,
  getCustomTools,
  updateCustomTool,
  deleteCustomTool,
} = require("./controllers/agent-custom-tools.controller");
const agentsController = require("./controllers/agents.controller");

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
router.post("/chat", handleChatFilesUpload, validate(chatPayloadSchema, "body"), chat);
router.get("/chat/history", validate(getChatHistorySchema, "query"), getChatHistory);
router.delete("/chat/:sessionId", deleteChatSession);
router.post(
  "/chat/messages/:messageId/feedback",
  validate(submitFeedbackSchema, "body"),
  submitFeedback
);
router.post("/chat/:sessionId/share", shareChatSession);
router.get("/chat/share/:token", getSharedChatPreview);
router.post("/chat/share/:token/fork", forkSharedChat);

router.get("/models", getAvailableModels);

// Agent House - Agents
router.post(
  "/agents",
  requireManageWeaveAi,
  validate(createUserAgentSchema, "body"),
  (req, res, next) => agentsController.createAgent(req, res, next)
);
router.get("/agents", (req, res, next) => agentsController.getAgents(req, res, next));
router.get("/agents/providers", getAvailableModels);
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
  createLlmConfig
);
router.get("/agents/llms", getLlmConfigs);
router.put(
  "/agents/llms/:id",
  requireManageWeaveAi,
  validate(updateLlmSchema, "body"),
  updateLlmConfig
);
router.delete("/agents/llms/:id", requireManageWeaveAi, deleteLlmConfig);

// Agent House - Custom Tools
router.post(
  "/agents/tools",
  requireManageWeaveAi,
  validate(createCustomToolSchema, "body"),
  createCustomTool
);
router.get("/agents/tools", getCustomTools);
router.put(
  "/agents/tools/:id",
  requireManageWeaveAi,
  validate(updateCustomToolSchema, "body"),
  updateCustomTool
);
router.delete("/agents/tools/:id", requireManageWeaveAi, deleteCustomTool);

module.exports = router;
