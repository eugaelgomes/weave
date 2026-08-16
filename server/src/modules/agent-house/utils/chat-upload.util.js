/**
 * @module agent-house/utils/chat-upload.util
 * @description Multer configuration and upload middleware for Weave AI chat file attachments.
 * Handles validation of file types, MIME types and per-category size limits.
 */
const path = require("path");
const multer = require("multer");
const { ERROR_CODES } = require("@/errors/codes");

const CHAT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const CHAT_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const CHAT_ALLOWED_FILE_RULES = {
  ".csv": {
    label: "CSV",
    maxSizeBytes: CHAT_DOCUMENT_MAX_SIZE_BYTES,
    mimeTypes: ["text/csv", "application/csv", "text/plain"],
  },
  ".jpeg": {
    label: "JPG",
    maxSizeBytes: CHAT_IMAGE_MAX_SIZE_BYTES,
    mimeTypes: ["image/jpeg"],
  },
  ".jpg": {
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
    mimeTypes: ["application/vnd.ms-excel", "application/octet-stream", "application/excel"],
  },
};

const chatUpload = multer({
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
  limits: {
    fileSize: CHAT_DOCUMENT_MAX_SIZE_BYTES,
  },
  storage: multer.memoryStorage(),
}).array("files", 10);

/**
 * Multer middleware for agent knowledge file uploads (max 5 files, 5MB each).
 */
const knowledgeUpload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  storage: multer.memoryStorage(),
}).array("knowledge_files", 5);

/**
 * Express middleware that validates chat file uploads by format and per-category size limit.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
function handleChatFilesUpload(req, res, next) {
  chatUpload(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          code: ERROR_CODES.FILE_TOO_LARGE,
          error: "Attached file exceeds the allowed size (5MB for images, 10MB for documents).",
          success: false,
        });
      }

      return res.status(400).json({
        code: ERROR_CODES.INVALID_FILE_TYPE,
        error: "Failed to validate attached files.",
        success: false,
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    for (const file of files) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const allowedRule = CHAT_ALLOWED_FILE_RULES[extension];
      if (!allowedRule) {
        return res.status(400).json({
          code: ERROR_CODES.INVALID_FILE_TYPE,
          error: `File "${file.originalname}" rejected: invalid format.`,
          success: false,
        });
      }

      if (typeof file.size === "number" && file.size > allowedRule.maxSizeBytes) {
        const maxSizeMb = allowedRule.maxSizeBytes / (1024 * 1024);
        return res.status(400).json({
          code: ERROR_CODES.FILE_TOO_LARGE,
          error: `File "${file.originalname}" rejected: maximum size for ${allowedRule.label} is ${maxSizeMb}MB.`,
          success: false,
        });
      }
    }

    next();
  });
}

module.exports = {
  CHAT_ALLOWED_FILE_RULES,
  CHAT_DOCUMENT_MAX_SIZE_BYTES,
  CHAT_IMAGE_MAX_SIZE_BYTES,
  handleChatFilesUpload,
  knowledgeUpload,
};
