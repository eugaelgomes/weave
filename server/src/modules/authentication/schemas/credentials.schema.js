const { z } = require("zod");

const signinSchema = z
  .object({
    email: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used for authentication."),
    login: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used for authentication."),
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
  .refine((data) => Boolean(data.login || data.email), {
    message: "Email is required.",
    path: ["email"],
  })
  .strict("Invalid signin payload structure.");

const signinCodeRequestSchema = z
  .object({
    email: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used to request a login code."),
    login: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used to request a login code."),
  })
  .refine((data) => Boolean(data.login || data.email), {
    message: "Email is required.",
    path: ["email"],
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
    email: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used to verify a login code."),
    login: z
      .email("Invalid email format.")
      .max(255, "Invalid email length.")
      .trim()
      .toLowerCase()
      .optional()
      .describe("The email address used to verify a login code."),
    verify_only: z
      .boolean()
      .optional()
      .describe(
        "Optional flag that, if true, only verifies credentials without starting a new session."
      ),
  })
  .refine((data) => Boolean(data.login || data.email), {
    message: "Email is required.",
    path: ["email"],
  })
  .strict("Invalid signin code verification payload structure.");

module.exports = { signinCodeRequestSchema, signinCodeVerifySchema, signinSchema };
