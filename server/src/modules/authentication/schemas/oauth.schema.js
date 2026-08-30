const { z } = require("zod");

const oauthCallbackSchema = z.object({
  code: z
    .string()
    .min(8, "Invalid authorization code length.")
    .max(2048, "Invalid authorization code length.")
    .regex(/^[A-Za-z0-9._\-~/+=:]+$/, "Invalid authorization code characters.")
    .trim()
    .optional()
    .describe(
      "The authorization code returned by the OAuth provider after successful user authentication."
    ),
  error: z
    .string()
    .min(1, "Invalid OAuth error length.")
    .max(100, "Invalid OAuth error length.")
    .trim()
    .optional()
    .describe("The error message returned by the OAuth provider in case of authorization failure."),
  state: z
    .string({ required_error: "OAuth state is required." })
    .min(8, "Invalid OAuth state length.")
    .max(255, "Invalid OAuth state length.")
    .regex(/^[A-Za-z0-9._\-]+$/, "Invalid OAuth state characters.")
    .trim()
    .describe(
      "The state value sent in the original OAuth request to prevent cross-site request forgery (CSRF) attacks."
    ),
});

module.exports = { oauthCallbackSchema };
