const { z } = require("zod");

/**
 * Validates route parameters for API token operations.
 */
const workspaceTokenParamsSchema = z.object({
  id: z
    .string()
    .uuid("Invalid API token ID format")
    .optional()
    .describe("O identificador único do token da API no formato UUID."),
});

/**
 * Validates the request body for creating a new API token.
 */
const createWorkspaceTokenSchema = z.object({
  expiresAt: z
    .string()
    .datetime("Invalid expiration date")
    .optional()
    .nullable()
    .describe("A data e hora de expiração do token de API, no formato ISO 8601."),
  name: z
    .string()
    .trim()
    .min(1, "Token name is required")
    .max(255, "Token name must be 255 characters or less")
    .describe("O nome descritivo fornecido para identificar o token da API."),
  scopes: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("Uma lista de permissões ou escopos de acesso concedidos a este token."),
  workspaceId: z
    .string()
    .uuid("Invalid workspace ID format")
    .optional()
    .nullable()
    .describe(
      "O identificador único do workspace associado ao token, se aplicável, no formato UUID."
    ),
});

module.exports = {
  createWorkspaceTokenSchema,
  workspaceTokenParamsSchema,
};
