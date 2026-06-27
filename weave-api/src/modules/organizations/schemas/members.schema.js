const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/data/email-rules");
const { validRoles } = require("@/modules/organizations/normalizer");

const PROJECT_MEMBER_ROLES = [
  "PROJECT_MANAGER",
  "CONTRIBUTOR",
  "COMMENTER",
  "VIEWER",
];

const targetAreaSchema = z.object({
  area_id: z.string().uuid("Invalid area ID format").optional(),
  role: z.enum(PROJECT_MEMBER_ROLES).optional().default("CONTRIBUTOR"),
});

/**
 * Validates the request body for inviting a member.
 */
const inviteMemberSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .refine(
      (email) => !hasPlusAliasInLocalPart(email),
      "Email addresses using a plus (+) alias in the local part are not allowed."
    ),
  role: z
    .enum(validRoles, {
      errorMap: () => ({
        message:
          "Invalid role. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST",
      }),
    })
    .optional()
    .default("MEMBER"),
  name: z.string().trim().min(1, "Name is required"),
  username: z.string().trim().optional(),
  target_areas: z.array(targetAreaSchema).optional().default([]),
});

/**
 * Validates the request body for bulk inviting members.
 */
const inviteMembersBulkSchema = z.object({
  invites: z
    .array(inviteMemberSchema)
    .min(1, "An array of invites is required"),
});

/**
 * Validates the request body for accepting an invite.
 */
const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

/**
 * Validates the request body for updating a member's role.
 */
const updateMemberRoleSchema = z.object({
  role: z.enum(validRoles, {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

module.exports = {
  inviteMemberSchema,
  inviteMembersBulkSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
};
