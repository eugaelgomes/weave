const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/formatters.util");
const { validRoles } = require("@/modules/organizations/normalizer");

const PROJECT_MEMBER_ROLES = ["PROJECT_MANAGER", "CONTRIBUTOR", "COMMENTER", "VIEWER"];

const targetAreaSchema = z.object({
  area_id: z
    .string()
    .uuid("Invalid area ID format")
    .optional()
    .describe("The universally unique identifier of the target area."),
  role: z
    .enum(PROJECT_MEMBER_ROLES)
    .optional()
    .default("CONTRIBUTOR")
    .describe(
      "The role of the member in the target area. Valid roles: PROJECT_MANAGER, CONTRIBUTOR, COMMENTER, VIEWER."
    ),
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
    )
    .describe("The email address of the user to invite."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .describe("The full name of the user to invite."),
  role: z
    .enum(validRoles, {
      errorMap: () => ({
        message: "Invalid role. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST",
      }),
    })
    .optional()
    .default("MEMBER")
    .describe(
      "The role of the member in the organization. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
  target_areas: z
    .array(targetAreaSchema)
    .optional()
    .default([])
    .describe("An array of target areas and roles to assign to the invited user."),
  username: z.string().trim().optional().describe("The chosen username for the invited user."),
});

/**
 * Validates the request body for bulk inviting members.
 */
const inviteMembersBulkSchema = z.object({
  invites: z
    .array(inviteMemberSchema)
    .min(1, "An array of invites is required")
    .describe("An array of member invitation objects."),
});

/**
 * Validates the request body for accepting an invite.
 */
const acceptInviteSchema = z.object({
  name: z.string().trim().optional().describe("The full name of the user accepting the invite."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .describe("The chosen password for the user accepting the invite."),
  token: z
    .string()
    .min(1, "Token is required")
    .describe("The invitation token received by the user."),
  username: z
    .string()
    .trim()
    .optional()
    .describe("The chosen username for the user accepting the invite."),
});

/**
 * Validates the request body for updating a member's role.
 */
const updateMemberRoleSchema = z.object({
  role: z
    .enum(validRoles, {
      errorMap: () => ({ message: "Invalid role" }),
    })
    .describe(
      "The role of the member in the organization. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
});

module.exports = {
  acceptInviteSchema,
  inviteMembersBulkSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
};
