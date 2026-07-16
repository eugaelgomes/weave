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
  email: z.string().email(),
  org_default_area_id: z.string().uuid().nullable(),
  org_default_area_role: z.string().nullable(),
  org_default_area_slug: z.string().nullable(),
  org_id: z.string().uuid().nullable(),
  org_member_role: z.string().nullable(),
  org_unique_name: z.string().nullable(),
  plan_id: z.string().uuid().nullable(),
  userId: z.string().uuid("Invalid userId in JWT payload."),
  username: z.string().min(1),
});

/**
 * Builds a validated JWT payload from raw user and organization data.
 * Throws a ZodError if any required field is missing or invalid.
 *
 * @param {{
 *   user_id: string,
 *   username: string,
 *   email: string,
 *   plan_id: string | null,
 * }} user
 * @param {ReturnType<import('./controllers/base.controller')['_normalizeOrganization']>} organization
 * @param {ReturnType<import('./controllers/base.controller')['_normalizeDefaultArea']>} defaultArea
 * @returns {z.infer<typeof jwtPayloadSchema>}
 */
function buildJwtPayload(user, organization, defaultArea) {
  return jwtPayloadSchema.parse({
    email: user.email,
    org_default_area_id: defaultArea?.id ?? null,
    org_default_area_role: defaultArea?.role ?? null,
    org_default_area_slug: defaultArea?.slug ?? null,
    org_id: organization?.id ?? null,
    org_member_role: organization?.member_role ?? null,
    org_unique_name: organization?.unique_name ?? null,
    plan_id: user.plan_id ?? null,
    userId: user.user_id,
    username: user.username,
  });
}

module.exports = { buildJwtPayload, jwtPayloadSchema };
