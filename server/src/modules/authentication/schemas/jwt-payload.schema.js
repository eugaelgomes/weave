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
    .describe("O endereço de e-mail associado à conta do usuário autenticado."),
  org_default_area_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "O identificador único (UUID) da área de trabalho (workspace) padrão do usuário na organização, caso exista."
    ),
  org_default_area_role: z
    .string()
    .nullable()
    .describe("O papel ou nível de permissão (role) do usuário dentro da área de trabalho padrão."),
  org_default_area_slug: z
    .string()
    .nullable()
    .describe("O identificador legível (slug) da área de trabalho padrão do usuário."),
  org_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "O identificador único (UUID) da organização principal vinculada à sessão do usuário."
    ),
  org_member_role: z
    .string()
    .nullable()
    .describe(
      "O papel do usuário (role) dentro da organização, determinando suas permissões organizacionais."
    ),
  org_unique_name: z
    .string()
    .nullable()
    .describe("O nome exclusivo (slug/username) da organização associada à sessão."),
  plan_id: z
    .string()
    .uuid()
    .nullable()
    .describe(
      "O identificador (UUID) do plano de assinatura ativo associado ao usuário ou à organização."
    ),
  userId: z
    .string()
    .uuid("Invalid userId in JWT payload.")
    .describe("O identificador único (UUID) do usuário autenticado no sistema."),
  username: z.string().min(1).describe("O nome de usuário único do usuário autenticado."),
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
