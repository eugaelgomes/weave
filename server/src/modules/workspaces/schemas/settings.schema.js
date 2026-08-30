const { z } = require("zod");
const {
  WORKSPACE_BUSINESS_ROLES,
} = require("@/modules/workspaces/utils/workspace-creation-steps.util");

/**
 * Validates the request body for saving workspace creation step 1.
 */
const saveStepOneSchema = z.object({
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, "country must use 2-letter ISO code (example: US, BR)")
    .optional()
    .nullable(),
  default_locale: z
    .string()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, "default_locale must use format ll-CC (example: en-US)")
    .optional()
    .nullable(),
  description: z.string().trim().optional().nullable(),
  language: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  unique_name: z.string().trim().min(1, "unique_name is required"),
  workspace_name: z.string().trim().min(1, "workspace_name is required"),
  workspace_role: z.enum(WORKSPACE_BUSINESS_ROLES, {
    errorMap: () => ({
      message: `workspace_role must be one of: ${WORKSPACE_BUSINESS_ROLES.join(", ")}`,
    }),
  }),
});

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

/**
 * Standardizes the domain data response.
 */
const domainResponseSchema = z
  .object({
    domain: z.any(),
    orgSettings: z.any(),
  })
  .transform(({ domain, orgSettings }) => {
    if (!domain) return null;
    return {
      created_at: domain.created_at,
      deleted: false,
      domain_name: domain.domain_name,
      id: domain.domain_name,
      instructions: {
        description:
          "Create a TXT record for _weave-challenge.<domain> with the provided value to complete verification.",
        host: `_weave-challenge.${domain.domain_name}`,
        type: "TXT",
        value: domain.verification_token,
      },
      sso_enabled: orgSettings.saml?.enabled || false,
      sso_metadata: orgSettings.saml?.metadata || null,
      sso_provider: orgSettings.saml?.provider || null,
      status: domain.status,
      updated_at: domain.updated_at || domain.created_at,
      verification_token: domain.verification_token,
      verified_at: domain.verified_at,
      workspace_id: orgSettings.workspace_id,
    };
  });

module.exports = {
  createDomainSchema,
  domainResponseSchema,
  saveStepOneSchema,
  updateSsoSettingsSchema,
};
