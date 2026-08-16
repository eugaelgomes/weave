const { z } = require("zod");

/**
 * Validates the request body for creating a domain.
 */
const createDomainSchema = z.object({
  domain_name: z
    .string()
    .trim()
    .min(1, "domain_name is required")
    .describe("The fully qualified domain name."),
});

/**
 * Validates the request body for updating SSO settings.
 */
const updateSsoSettingsSchema = z.object({
  enabled: z
    .boolean()
    .optional()
    .describe("Indicates whether Single Sign-On is enabled for this domain."),
  metadata: z
    .object({
      acsUrl: z
        .string()
        .trim()
        .optional()
        .describe("The Assertion Consumer Service URL for the Single Sign-On provider."),
      certificate: z
        .string()
        .trim()
        .min(1, "certificate is required")
        .describe("The public certificate provided by the Single Sign-On Identity Provider."),
      entityId: z
        .string()
        .trim()
        .min(1, "entityId is required")
        .describe("The Entity Identifier for the Single Sign-On Identity Provider."),
      sloUrl: z
        .string()
        .trim()
        .optional()
        .nullable()
        .describe("The Single Logout URL for the Single Sign-On provider."),
      ssoUrl: z.string().trim().optional().describe("The Single Sign-On login URL."),
    })
    .refine((data) => data.ssoUrl || data.acsUrl, {
      message: "ssoUrl or acsUrl is required",
      path: ["ssoUrl"],
    })
    .describe("A configuration object containing the Single Sign-On metadata."),
  provider: z
    .literal("saml", {
      errorMap: () => ({
        message: "Currently only SAML providers are supported",
      }),
    })
    .describe("The Single Sign-On provider type. Only saml is supported."),
});

module.exports = {
  createDomainSchema,
  updateSsoSettingsSchema,
};
