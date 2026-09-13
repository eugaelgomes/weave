const { z } = require("zod");

const ssoDiscoverSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .email("Invalid email format.")
    .trim()
    .describe("Email to check for enterprise SSO requirements."),
});

const samlAcsCallbackSchema = z.object({
  RelayState: z
    .string({ required_error: "RelayState (workspaceId) is required." })
    .uuid("RelayState must be a valid workspace UUID.")
    .describe("The relay state parameter, representing the workspace UUID."),
  SAMLResponse: z
    .string({ required_error: "SAMLResponse is required." })
    .min(1)
    .describe("The SAML response XML received from the Identity Provider."),
});

module.exports = { samlAcsCallbackSchema, ssoDiscoverSchema };
