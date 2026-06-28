const express = require("express");

const { chat } = require("./controllers/chat/chat.controller");
const { getChatHistory } = require("./controllers/chat/get-chat-history.controller");
const { deleteChatSession } = require("./controllers/chat/delete-chat-session.controller");
const { getAvailableModels } = require("./controllers/chat/get-available-models.controller");
const { submitFeedback } = require("./controllers/chat/submit-feedback.controller");
const { shareChatSession } = require("./controllers/chat/share-chat-session.controller");
const { getSharedChatPreview } = require("./controllers/chat/get-shared-chat-preview.controller");
const { forkSharedChat } = require("./controllers/chat/fork-shared-chat.controller");

const { getUserAgents } = require("./controllers/agent/get-user-agents.controller");
const { getProvidersAndModels } = require("./controllers/agent/get-providers-and-models.controller");
const { getAgentById } = require("./controllers/agent/get-agent-by-id.controller");
const { createUserAgent } = require("./controllers/agent/create-user-agent.controller");
const { updateAgent } = require("./controllers/agent/update-agent.controller");
const { deleteAgent } = require("./controllers/agent/delete-agent.controller");
const { shareAgent } = require("./controllers/agent/share-agent.controller");
const { assignToProject } = require("./controllers/agent/assign-to-project.controller");
const { unassignFromProject } = require("./controllers/agent/unassign-from-project.controller");
const { toggleActive } = require("./controllers/agent/toggle-active.controller");
const { duplicateAgent } = require("./controllers/agent/duplicate-agent.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  requireOrgPermission,
} = require("@/middlewares/auth/require-org-permission");
const { validate } = require("@/middlewares/validation/validate");
const {
  createUserAgentSchema,
  updateAgentSchema,
  shareAgentSchema,
  assignToProjectSchema,
  toggleActiveSchema,
  chatPayloadSchema,
  submitFeedbackSchema,
  getChatHistorySchema,
} = require("./schemas/weave-ai.schema");
const {
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
const { strictLimiter } = require("@/middlewares/security/request-limiters");
const {
  handleChatFilesUpload,
  knowledgeUpload,
} = require("./utils/chat-upload.util");

const router = express.Router();

const requireManageWeaveAi = requireOrgPermission(
  ORG_PERMISSIONS.MANAGE_WEAVE_AI
);

router.use(verifyToken, strictLimiter);

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
router.post(
  "/chat",
  handleChatFilesUpload,
  validate(chatPayloadSchema, "body"),
  chat
);
router.get(
  "/chat/history",
  validate(getChatHistorySchema, "query"),
  getChatHistory
);
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

// Agent management endpoints
router.get("/agents", getUserAgents);
router.get("/agents/providers", getProvidersAndModels);

router.get("/agents/:id", getAgentById);
router.post(
  "/agents",
  requireManageWeaveAi,
  knowledgeUpload,
  validate(createUserAgentSchema, "body"),
  createUserAgent
);
router.put(
  "/agents/:id",
  requireManageWeaveAi,
  knowledgeUpload,
  validate(updateAgentSchema, "body"),
  updateAgent
);
router.delete(
  "/agents/:id",
  requireManageWeaveAi,
  deleteAgent
);
router.post(
  "/agents/:id/share",
  requireManageWeaveAi,
  validate(shareAgentSchema, "body"),
  shareAgent
);

// Agent ↔ Project binding
router.put(
  "/agents/:id/project",
  requireManageWeaveAi,
  validate(assignToProjectSchema, "body"),
  assignToProject
);
router.delete(
  "/agents/:id/project",
  requireManageWeaveAi,
  unassignFromProject
);

// Agent lifecycle
router.patch(
  "/agents/:id/active",
  requireManageWeaveAi,
  validate(toggleActiveSchema, "body"),
  toggleActive
);
router.post(
  "/agents/:id/duplicate",
  requireManageWeaveAi,
  duplicateAgent
);

module.exports = router;
