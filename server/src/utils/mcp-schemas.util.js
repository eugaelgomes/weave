const { z } = require("zod");

/**
 * Shared Zod primitives for MCP tool schemas.
 * Import from here instead of defining inline to ensure
 * consistent validation across all tools.
 */

/** UUID v1–v5 */
const uuidSchema = z.string().uuid("Must be a valid UUID");

/** RFC 5321 email */
const emailSchema = z.string().email("Must be a valid email address");

/** Calendar event sync states */
const syncStatusSchema = z.enum(["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"]);

module.exports = {
  emailSchema,
  syncStatusSchema,
  uuidSchema,
};
