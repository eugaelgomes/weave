const { z } = require("zod");

/**
 * Validates the request body for creating a domain.
 */
const createDomainSchema = z.object({
  domain_name: z.string().trim().min(1, "domain_name is required"),
});

/**
 * Validates the request body for updating SSO settings.
 */
const updateSsoSettingsSchema = z.object({
  provider: z.literal("saml", {
    errorMap: () => ({
      message: "Currently only SAML providers are supported",
    }),
  }),
  metadata: z
    .object({
      entityId: z.string().trim().min(1, "entityId is required"),
      ssoUrl: z.string().trim().optional(),
      acsUrl: z.string().trim().optional(),
      sloUrl: z.string().trim().optional().nullable(),
      certificate: z.string().trim().min(1, "certificate is required"),
    })
    .refine((data) => data.ssoUrl || data.acsUrl, {
      message: "ssoUrl or acsUrl is required",
      path: ["ssoUrl"],
    }),
  enabled: z.boolean().optional(),
});

module.exports = {
  createDomainSchema,
  updateSsoSettingsSchema,
};
