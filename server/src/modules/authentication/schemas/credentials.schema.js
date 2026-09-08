const { z } = require("zod");

const signinSchema = z
  .object({
    login: z
      .string({ required_error: "Username or email is required." })
      .min(3, "Invalid username or email length.")
      .max(255, "Invalid username or email length.")
      .trim()
      .describe("The username or email address used for authentication."),
    password: z
      .string({ required_error: "Password is required." })
      .min(1, "Password is required.")
      .max(255, "Invalid password length.")
      .describe("The user's password for logging in."),
    verify_only: z
      .boolean()
      .optional()
      .describe(
        "Optional flag that, if true, only verifies credentials without starting a new session."
      ),
  })
  .strict("Invalid signin payload structure.");

const signinCodeRequestSchema = z
  .object({
    login: z
      .string({ required_error: "Username or email is required." })
      .min(3, "Invalid username or email length.")
      .max(255, "Invalid username or email length.")
      .trim()
      .describe("The username or email address used to request a login code."),
  })
  .strict("Invalid signin code request payload structure.");

const signinCodeVerifySchema = z
  .object({
    code: z
      .string({ required_error: "Code is required." })
      .min(6, "Invalid code length.")
      .max(6, "Invalid code length.")
      .trim()
      .regex(/^\d{6}$/, "Invalid code format.")
      .describe("The one-time code sent to the user's email."),
    login: z
      .string({ required_error: "Username or email is required." })
      .min(3, "Invalid username or email length.")
      .max(255, "Invalid username or email length.")
      .trim()
      .describe("The username or email address used to verify a login code."),
    verify_only: z
      .boolean()
      .optional()
      .describe(
        "Optional flag that, if true, only verifies credentials without starting a new session."
      ),
  })
  .strict("Invalid signin code verification payload structure.");

module.exports = { signinCodeRequestSchema, signinCodeVerifySchema, signinSchema };
