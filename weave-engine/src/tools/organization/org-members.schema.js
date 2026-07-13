/**
 * @module weave-engine/modules/core/tools/schemas/org-members.schema
 * @description JSON Schema definition for the org-members.schema AI tool.
 */
const { z } = require("zod");

const listOrgMembersZodSchema = z.object({});

const getOrgMemberZodSchema = z.object({
  memberId: z.string().describe("The UUID of the user (member) to look up."),
});

const schemas = [
  {
    description:
      "Lists all active members of the organization the user belongs to. Returns each member's user ID, name, username, email, avatar, role (SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST), and status. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "list_org_members",
    parameters: listOrgMembersZodSchema.toJSONSchema(),
  },
  {
    description:
      "Fetches detailed information about a specific organization member by their user ID. Returns the member's role, status, name, username, email, and avatar URL. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "get_org_member",
    parameters: getOrgMemberZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_org_member: getOrgMemberZodSchema,
  list_org_members: listOrgMembersZodSchema,
};

module.exports = { schemas, zodSchemas };
