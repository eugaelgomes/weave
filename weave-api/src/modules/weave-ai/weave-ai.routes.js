const express = require("express");
const multer = require("multer");
const path = require("path");

const aiController = require("./controllers/chat.controller");
const agentController = require("./controllers/agents.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  requireOrgPermission,
} = require("@/middlewares/auth/require-org-permission");
const {
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
const { strictLimiter } = require("@/middlewares/security/request-limiters");
const { ERROR_CODES } = require("@/errors/codes");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const CHAT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CHAT_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const CHAT_ALLOWED_FILE_RULES = {
  ".csv": {
    label: "CSV",
    maxSizeBytes: CHAT_DOCUMENT_MAX_SIZE_BYTES,
    mimeTypes: ["text/csv", "application/csv", "text/plain"],
  },
  ".jpg": {
    label: "JPG",
    maxSizeBytes: CHAT_IMAGE_MAX_SIZE_BYTES,
    mimeTypes: ["image/jpeg"],
  },
  ".jpeg": {
    label: "JPG",
    maxSizeBytes: CHAT_IMAGE_MAX_SIZE_BYTES,
    mimeTypes: ["image/jpeg"],
  },
  ".pdf": {
    label: "PDF",
    maxSizeBytes: CHAT_DOCUMENT_MAX_SIZE_BYTES,
    mimeTypes: ["application/pdf"],
  },
  ".png": {
    label: "PNG",
    maxSizeBytes: CHAT_IMAGE_MAX_SIZE_BYTES,
    mimeTypes: ["image/png"],
  },
  ".xls": {
    label: "XLS",
    maxSizeBytes: CHAT_DOCUMENT_MAX_SIZE_BYTES,
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/octet-stream",
      "application/excel",
    ],
  },
};

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CHAT_DOCUMENT_MAX_SIZE_BYTES,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedRule = CHAT_ALLOWED_FILE_RULES[extension];

    if (!allowedRule) {
      return callback(
        new Error(
          `File "${file.originalname}" rejected: invalid format. Allowed formats: PNG, JPG, PDF, CSV, XLS.`
        )
      );
    }

    if (
      Array.isArray(allowedRule.mimeTypes) &&
      allowedRule.mimeTypes.length > 0 &&
      file.mimetype &&
      !allowedRule.mimeTypes.includes(file.mimetype)
    ) {
      return callback(
        new Error(
          `File "${file.originalname}" rejected: invalid MIME type for ${allowedRule.label}.`
        )
      );
    }

    return callback(null, true);
  },
}).array("files", 10);

/**
 * Validates chat upload constraints by file category.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
function handleChatFilesUpload(req, res, next) {
  chatUpload(req, res, (error) => {
    if (error) {
      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          code: ERROR_CODES.FILE_TOO_LARGE,
          error:
            "Attached file exceeds the allowed size (5MB for images, 10MB for documents).",
        });
      }

      return res.status(400).json({
        success: false,
        code: ERROR_CODES.INVALID_FILE_TYPE,
        error: "Failed to validate attached files.",
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    for (const file of files) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const allowedRule = CHAT_ALLOWED_FILE_RULES[extension];
      if (!allowedRule) {
        return res.status(400).json({
          success: false,
          code: ERROR_CODES.INVALID_FILE_TYPE,
          error: `File "${file.originalname}" rejected: invalid format.`,
        });
      }

      if (
        typeof file.size === "number" &&
        file.size > allowedRule.maxSizeBytes
      ) {
        const maxSizeMb = allowedRule.maxSizeBytes / (1024 * 1024);
        return res.status(400).json({
          success: false,
          code: ERROR_CODES.FILE_TOO_LARGE,
          error: `File "${file.originalname}" rejected: maximum size for ${allowedRule.label} is ${maxSizeMb}MB.`,
        });
      }
    }

    next();
  });
}

const knowledgeUpload = upload.array("knowledge_files", 5);
const bind = (controller, method) => controller[method].bind(controller);

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
router.post("/chat", handleChatFilesUpload, bind(aiController, "chat"));
router.get("/chat/history", bind(aiController, "getChatHistory"));
router.delete("/chat/:sessionId", bind(aiController, "deleteChatSession"));
router.post(
  "/chat/messages/:messageId/feedback",
  bind(aiController, "submitFeedback")
);

router.get("/models", bind(aiController, "getAvailableModels"));

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

// Agent ↔ Project binding
router.put(
  "/agents/:id/project",
  requireManageWeaveAi,
  bind(agentController, "assignToProject")
);
router.delete(
  "/agents/:id/project",
  requireManageWeaveAi,
  bind(agentController, "unassignFromProject")
);

// Agent lifecycle
router.patch(
  "/agents/:id/active",
  requireManageWeaveAi,
  bind(agentController, "toggleActive")
);
router.post(
  "/agents/:id/duplicate",
  requireManageWeaveAi,
  bind(agentController, "duplicateAgent")
);

module.exports = router;
