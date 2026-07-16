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
  enabled: z.boolean().optional(),
  metadata: z
    .object({
      acsUrl: z.string().trim().optional(),
      certificate: z.string().trim().min(1, "certificate is required"),
      entityId: z.string().trim().min(1, "entityId is required"),
      sloUrl: z.string().trim().optional().nullable(),
      ssoUrl: z.string().trim().optional(),
    })
    .refine((data) => data.ssoUrl || data.acsUrl, {
      message: "ssoUrl or acsUrl is required",
      path: ["ssoUrl"],
    }),
  provider: z.literal("saml", {
    errorMap: () => ({
      message: "Currently only SAML providers are supported",
    }),
  }),
});

module.exports = {
  createDomainSchema,
  updateSsoSettingsSchema,
};
