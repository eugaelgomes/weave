const { z } = require("zod");
const { hasPlusAliasInLocalPart } = require("@/utils/formatters.util");
const { validRoles } = require("@/modules/workspaces/normalizer");

const PROJECT_MEMBER_ROLES = ["PROJECT_MANAGER", "CONTRIBUTOR", "COMMENTER", "VIEWER"];

const targetAreaSchema = z.object({
  area_id: z
    .string()
    .uuid("Invalid team ID format")
    .optional()
    .describe("The universally unique identifier of the target team."),
  role: z
    .enum(PROJECT_MEMBER_ROLES)
    .optional()
    .default("CONTRIBUTOR")
    .describe(
      "The role of the member in the target team. Valid roles: PROJECT_MANAGER, CONTRIBUTOR, COMMENTER, VIEWER."
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
      "The role of the member in the workspace. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
  target_areas: z
    .array(targetAreaSchema)
    .optional()
    .default([])
    .describe("An array of target teams and roles to assign to the invited user."),
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
      "The role of the member in the workspace. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
});

/**
 * Standardizes the member data response.
 */
const memberResponseSchema = z
  .object({
    avatar_url: z.string().nullable().optional(),
    created_at: z.union([z.string(), z.date()]).optional(),
    email: z.string(),
    invited_by: z.string().nullable().optional(),
    inviter_avatar_url: z.string().nullable().optional(),
    inviter_name: z.string().nullable().optional(),
    inviter_username: z.string().nullable().optional(),
    last_login_at: z.union([z.string(), z.date()]).nullable().optional(),
    name: z.string(),
    notes_count: z.union([z.string(), z.number()]).optional(),
    projects: z.array(z.any()).optional(),
    role: z.string(),
    status: z.string(),
    teams: z.array(z.any()).optional(),
    updated_at: z.union([z.string(), z.date()]).optional(),
    user_id: z.string(),
    username: z.string().nullable().optional(),
  })
  .transform((member) => ({
    member_data: {
      activity: {
        last_login_at: member.last_login_at || null,
        notes_count:
          typeof member.notes_count === "string"
            ? parseInt(member.notes_count, 10)
            : member.notes_count || 0,
        projects: member.projects || [],
        teams: member.teams || [],
      },
      avatar_url: member.avatar_url || null,
      email: member.email,
      id: member.user_id,
      invited_by: member.invited_by
        ? {
            avatar_url: member.inviter_avatar_url || null,
            id: member.invited_by,
            name: member.inviter_name,
            username: member.inviter_username,
          }
        : null,
      membership: {
        created_at: member.created_at,
        role: member.role,
        status: member.status,
        updated_at: member.updated_at,
      },
      name: member.name,
      username: member.username,
    },
  }));

/**
 * Standardizes the member list response.
 */
const memberListResponseSchema = z.array(memberResponseSchema);

module.exports = {
  acceptInviteSchema,
  inviteMembersBulkSchema,
  inviteMemberSchema,
  memberListResponseSchema,
  memberResponseSchema,
  updateMemberRoleSchema,
};
