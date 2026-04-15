const express = require("express");
const multer = require("multer");

const aiController = require("./controllers/chat.controller");
const agentController = require("./controllers/agents.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const { requireOrgPermission } = require("@/middlewares/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");
const { strictLimiter } = require("@/middlewares/request-limiters");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const knowledgeUpload = upload.array("knowledge_files", 5);
const bind = (controller, method) => controller[method].bind(controller);

const requireManageWeaveAi = requireOrgPermission(ORG_PERMISSIONS.MANAGE_WEAVE_AI);

router.use(verifyToken, strictLimiter);

// Chat endpoints
router.post("/chat", bind(aiController, "chat"));
router.get("/chat/history", bind(aiController, "getChatHistory"));

// AI catalog endpoints
router.get("/use-cases", bind(aiController, "listUseCases"));
router.get("/models", bind(aiController, "getAvailableModels"));
router.get("/functions", bind(aiController, "listAvailableFunctions"));

// Agent management endpoints
router.get("/agents", bind(agentController, "getUserAgents"));
router.get("/agents/providers", bind(agentController, "getProvidersAndModels"));

router.get("/agents/:id", bind(agentController, "getAgentById"));
router.post(
  "/agents",
  requireManageWeaveAi,
  knowledgeUpload,
  bind(agentController, "createUserAgent")
);
router.put(
  "/agents/:id",
  requireManageWeaveAi,
  knowledgeUpload,
  bind(agentController, "updateAgent")
);
router.delete(
  "/agents/:id",
  requireManageWeaveAi,
  bind(agentController, "deleteAgent")
);
router.post(
  "/agents/:id/share",
  requireManageWeaveAi,
  bind(agentController, "shareAgent")
);

module.exports = router;
