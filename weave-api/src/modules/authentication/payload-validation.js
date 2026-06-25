const { z } = require("zod");

// Signin

const signinSchema = z
  .object({
    login: z
      .string({ required_error: "Username or email is required." })
      .min(3, "Invalid username or email length.")
      .max(255, "Invalid username or email length.")
      .trim(),
    password: z
      .string({ required_error: "Password is required." })
      .min(1, "Password is required.")
      .max(255, "Invalid password length."),
    verify_only: z.boolean().optional(),
  })
  .strict("Invalid signin payload structure.");

// OAuth callback

const oauthCallbackSchema = z.object({
  code: z
    .string()
    .min(8, "Invalid authorization code length.")
    .max(2048, "Invalid authorization code length.")
    .regex(/^[A-Za-z0-9._\-~/+=:]+$/, "Invalid authorization code characters.")
    .trim()
    .optional(),
  error: z
    .string()
    .min(1, "Invalid OAuth error length.")
    .max(100, "Invalid OAuth error length.")
    .trim()
    .optional(),
  state: z
    .string({ required_error: "OAuth state is required." })
    .min(8, "Invalid OAuth state length.")
    .max(255, "Invalid OAuth state length.")
    .regex(/^[A-Za-z0-9._\-]+$/, "Invalid OAuth state characters.")
    .trim(),
});

module.exports = { oauthCallbackSchema, signinSchema };
