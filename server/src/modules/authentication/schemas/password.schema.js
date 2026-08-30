const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/formatters.util");

/**
 * Validates the request body for forgot password.
 */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .refine(
      (value) => !hasPlusAliasInLocalPart(value),
      "Emails with a plus (+) alias in the address are not allowed."
    )
    .describe(
      "The user's email address to which the password reset link will be sent."
    ),
});

/**
 * Validates the request body for reset password.
 */
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .describe("The new password chosen by the user to replace the old one."),
  token: z
    .string()
    .min(1, "Token is required")
    .describe(
      "The unique security token received by the user via email to authorize password reset."
    ),
});

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
};
