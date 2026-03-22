const express = require("express");
const multer = require("multer");

const aiController = require("./weave-ai.controller");
const agentController = require("./weave-ai.agents.controller");
const { verifyToken } = require("@/middlewares/verify-token");
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
  knowledgeUpload,
  bind(agentController, "createUserAgent")
);
router.put(
  "/agents/:id",
  knowledgeUpload,
  bind(agentController, "updateAgent")
);
router.delete("/agents/:id", bind(agentController, "deleteAgent"));
router.post("/agents/:id/share", bind(agentController, "shareAgent"));

module.exports = router;
