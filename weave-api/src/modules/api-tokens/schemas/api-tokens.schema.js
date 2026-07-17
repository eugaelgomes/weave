const { z } = require("zod");

/**
 * Validates route parameters for API token operations.
 */
const apiTokenParamsSchema = z.object({
  id: z
    .string()
    .uuid("Invalid API token ID format")
    .optional()
    .describe("O identificador único do token da API no formato UUID."),
});

/**
 * Validates the request body for creating a new API token.
 */
const createApiTokenSchema = z.object({
  expiresAt: z
    .string()
    .datetime("Invalid expiration date")
    .optional()
    .nullable()
    .describe(
      "A data e hora de expiração do token de API, no formato ISO 8601."
    ),
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(255, "Token name must be 255 characters or less")
    .describe("O nome descritivo fornecido para identificar o token da API."),
  organizationId: z
    .string()
    .uuid("Invalid organization ID format")
    .optional()
    .nullable()
    .describe(
      "O identificador único da organização associada ao token, se aplicável, no formato UUID."
    ),
  scopes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      "Uma lista de permissões ou escopos de acesso concedidos a este token."
    ),
});

module.exports = {
  apiTokenParamsSchema,
  createApiTokenSchema,
};
