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

module.exports = { signinSchema };
