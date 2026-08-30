const { z } = require("zod");

/**
 * Canonical schema for the JWT session payload.
 *
 * Used in two places:
 *   1. Before `jwt.sign()` — ensures no undefined/null field leaks into the token.
 *   2. After `jwt.verify()` — ensures the decoded token has the expected shape
 *      before being attached to `req.user`.
 */
const jwtPayloadSchema = z.object({
  email: z
    .string()
    .email()
    .describe("The email address associated with the authenticated user's account."),
  plan_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "The identifier (UUID) of the active subscription plan associated with the user or workspace."
    ),
  userId: z
    .string()
    .uuid("Invalid userId in JWT payload.")
    .describe("The unique identifier (UUID) of the authenticated user in the system."),
  username: z.string().min(1).describe("The unique username of the authenticated user."),
  workspace_default_team_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "The unique identifier (UUID) of the user's default workspace team in the workspace, if any."
    ),
  workspace_default_team_slug: z
    .string()
    .nullable()
    .describe("The human-readable identifier (slug) of the user's default workspace team."),
  workspace_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "The unique identifier (UUID) of the primary workspace linked to the user's session."
    ),
  workspace_member_role_id: z
    .string()
    .nullable()
    .describe(
      "The user's role ID within the workspace, determining their organizational permissions."
    ),
  workspace_unique_name: z
    .string()
    .nullable()
    .describe("The unique name (slug) of the workspace associated with the session."),
});

/**
 * Builds a validated JWT payload from raw user and workspace data.
 * Throws a ZodError if any required field is missing or invalid.
 *
 * @param {{
 *   user_id: string,
 *   username: string,
 *   email: string,
 *   plan_id: string | null,
 * }} user
 * @param {ReturnType<import('./controllers/base.controller')['_normalizeWorkspace']>} workspace
 * @param {ReturnType<import('./controllers/base.controller')['_normalizeDefaultTeam']>} defaultTeam
 * @returns {z.infer<typeof jwtPayloadSchema>}
 */
function buildJwtPayload(user, workspace, defaultTeam) {
  return jwtPayloadSchema.parse({
    email: user.email,
    plan_id: user.plan_id ?? null,
    userId: user.user_id,
    username: user.username,
    workspace_default_team_id: defaultTeam?.id ?? null,
    workspace_default_team_slug: defaultTeam?.slug ?? null,
    workspace_id: workspace?.id ?? null,
    workspace_member_role_id: workspace?.member_role_id ?? null,
    workspace_unique_name: workspace?.unique_name ?? null,
  });
}

module.exports = { buildJwtPayload, jwtPayloadSchema };
