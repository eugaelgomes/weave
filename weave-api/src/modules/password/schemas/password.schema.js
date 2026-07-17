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
    )
    .describe(
      "O endereço de e-mail do usuário para o qual o link de redefinição de senha será enviado."
    ),
});

/**
 * Validates the request body for reset password.
 */
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .describe("A nova senha escolhida pelo usuário para substituir a antiga."),
  token: z
    .string()
    .min(1, "Token is required")
    .describe(
      "O token de segurança único recebido pelo usuário por e-mail para autorizar a redefinição de senha."
    ),
});

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
};
