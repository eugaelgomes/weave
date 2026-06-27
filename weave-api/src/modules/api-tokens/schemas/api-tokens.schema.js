const { z } = require("zod");

/**
 * Validates route parameters for API token operations.
 */
const apiTokenParamsSchema = z.object({
  id: z.string().uuid("Invalid API token ID format").optional(),
});

/**
 * Validates the request body for creating a new API token.
 */
const createApiTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(255, "Token name must be 255 characters or less"),
  organizationId: z
    .string()
    .uuid("Invalid organization ID format")
    .optional()
    .nullable(),
  scopes: z.array(z.string()).optional().nullable(),
  expiresAt: z
    .string()
    .datetime("Invalid expiration date")
    .optional()
    .nullable(),
});

module.exports = {
  apiTokenParamsSchema,
  createApiTokenSchema,
};
