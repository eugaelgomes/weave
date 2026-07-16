const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/data/email-rules");

const nameRegex = /^[\p{L}\s]+$/u;
const usernameRegex = /^[a-zA-Z0-9._-]+$/;

// Shared field validators
const nameValidator = z
  .string()
  .trim()
  .min(1, "Name cannot be empty or too long.")
  .max(100, "Name cannot be empty or too long.")
  .regex(nameRegex, "Only letters and spaces are allowed.")
  .optional();

const usernameValidator = z
  .string()
  .trim()
  .min(6, "Username must be between 6 and 18 characters.")
  .max(18, "Username must be between 6 and 18 characters.")
  .regex(usernameRegex, "Only letters, numbers, ., -, or _ are allowed.")
  .toLowerCase();

const emailValidator = z
  .string()
  .trim()
  .email("Invalid email.")
  .refine((val) => !hasPlusAliasInLocalPart(val), {
    message: "Emails with a plus (+) alias are not allowed.",
  });

const passwordValidator = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

const createAccountSchema = z.object({
  birth_date: z.string().datetime().or(z.string().date()).nullable().optional(),
  email: emailValidator,
  locale: z.string().optional(),
  name: nameValidator,
  password: passwordValidator,
  phone_number: z.string().nullable().optional(),
  private_profile: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),
  timezone: z.string().optional(),
  user_name: nameValidator,
  username: usernameValidator,
});

const activateAccountSchema = z
  .object({
    code: z.string().optional(),
    email: z.string().email("Invalid email").optional(),
    token: z.string().optional(),
  })
  .refine((data) => data.token || (data.code && data.email), {
    message:
      "Activation token or both verification code and email are required",
    path: ["token"],
  });

const checkUsernamePublicSchema = z.object({
  username: z.string().min(1, "username query param is required"),
});

const checkAvailabilitySchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone_number: z.string().optional().or(z.literal("")),
  username: z.string().optional().or(z.literal("")),
});

const updateProfileSchema = z.object({
  birth_date: z
    .string()
    .datetime()
    .or(z.string().date())
    .nullable()
    .optional()
    .or(z.literal("")),
  currentPassword: z.string().optional(),
  email: emailValidator.optional().or(z.literal("")),
  emailValidationToken: z.string().optional(),
  name: nameValidator,
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .optional()
    .or(z.literal("")),
  phone_number: z.string().nullable().optional().or(z.literal("")),
  private_profile: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional(),
  theme_mode: z
    .enum(["light", "dark", "system", "LIGHT", "DARK", "SYSTEM"])
    .optional(),
  usage_preference: z.record(z.unknown()).optional(),
  user_preference: z.record(z.unknown()).optional(),
  username: usernameValidator.optional(),
});

const searchUsersSchema = z.object({
  exclude: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  q: z.string().optional(), // Can be a comma-separated list of IDs
});

const confirmDeleteAccountSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

module.exports = {
  activateAccountSchema,
  checkAvailabilitySchema,
  checkUsernamePublicSchema,
  confirmDeleteAccountSchema,
  createAccountSchema,
  searchUsersSchema,
  updateProfileSchema,
};
