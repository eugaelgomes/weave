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
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Country must use a 2-letter ISO code (example: BR, US)")
      .optional(),
    invite_token: z.string().optional(),
    language: z.enum(["pt-BR", "en-US", "es-ES"]).optional(),
    unique_name: z.string().max(40).optional(),
    workspace_description: z.string().trim().max(500).optional(),
    workspace_name: z.string().max(80).optional(),
    workspace_role: z.string().optional().default("general"),
    workspace_timezone: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.invite_token || (data.unique_name && data.workspace_name), {
    message: "You must provide an invite_token or create a new workspace with a name.",
  });

const onboardingTeamSchema = z.object({
  description: z.string().trim().max(240).optional(),
  name: z.string().trim().min(1, "Team name is required").max(80),
});

const onboardingMemberSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  name: z.string().trim().min(1, "Member name is required").max(100),
  team_index: z.number().int().min(0).optional(),
});

const submitStepThreeSchema = z.object({
  members: z.array(onboardingMemberSchema).max(50).optional().default([]),
  teams: z.array(onboardingTeamSchema).max(20).optional().default([]),
});

const workspaceUniqueNameAvailabilitySchema = z.object({
  unique_name: z.string().trim().min(1).max(40),
});

module.exports = {
  submitStepOneSchema,
  submitStepThreeSchema,
  submitStepTwoSchema,
  workspaceUniqueNameAvailabilitySchema,
};
