const { z } = require("zod");

const nameRegex = /^[\p{L}\s]+$/u;
const usernameRegex = /^[a-zA-Z0-9._-]+$/;

const nameValidator = z
  .string()
  .trim()
  .min(1, "Name cannot be empty.")
  .max(100, "Name cannot be too long.")
  .regex(nameRegex, "Only letters and spaces are allowed.");

const usernameValidator = z
  .string()
  .trim()
  .min(6, "Username must be between 6 and 18 characters.")
  .max(18, "Username must be between 6 and 18 characters.")
  .regex(usernameRegex, "Only letters, numbers, ., -, or _ are allowed.")
  .toLowerCase();

const preferencesValidator = z.object({
  language: z
    .object({
      dateFormat: z.enum(["DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
      interface: z.enum(["pt-BR", "en-US", "es-ES"]).optional(),
      timeFormat: z.enum(["12h", "24h"]).optional(),
    })
    .optional(),
});

const submitStepOneSchema = z.object({
  name: nameValidator.optional(),
  theme_mode: z.enum(["LIGHT", "DARK"]).optional(),
  timezone: z.string().optional(),
  usage_preference: preferencesValidator.optional(),
  username: usernameValidator.optional(),
});

const submitStepTwoSchema = z
  .object({
    invite_token: z.string().optional(),
    unique_name: z.string().max(40).optional(),
    workspace_name: z.string().max(80).optional(),
    workspace_role: z.string().optional().default("general"),
  })
  .refine((data) => data.invite_token || (data.unique_name && data.workspace_name), {
    message: "You must provide an invite_token or create a new workspace with a name.",
  });

const workspaceUniqueNameAvailabilitySchema = z.object({
  unique_name: z.string().trim().min(1).max(40),
});

module.exports = {
  submitStepOneSchema,
  submitStepTwoSchema,
  workspaceUniqueNameAvailabilitySchema,
};
