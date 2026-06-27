const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/data/email-rules");

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
    ),
});

/**
 * Validates the request body for reset password.
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
};
