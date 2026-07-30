const { z } = require("zod");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const domainsRepository = require("@/modules/organizations/repositories/domains.repository");
const { validRoles } = require("@/modules/organizations/normalizer");

const manageOrganizationsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    banner_url: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Organization banner image URL"),
    description: z
      .string()
      .optional()
      .nullable()
      .describe("Organization description"),
    logo_url: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Organization logo image URL"),
    org_name: z.string().optional().describe("Organization name"),
    settings: z
      .record(z.any())
      .optional()
      .nullable()
      .describe("Organization settings"),
    unique_name: z
      .string()
      .optional()
      .nullable()
      .describe("Globally unique identifier string for the org"),
  }),
  z.object({
    action: z.literal("get_active"),
  }),
]);

const manageOrganizationDomainsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    domain_name: z.string().describe("Domain name"),
  }),
  z.object({
    action: z.literal("update_sso"),
    domain_id: z.string().uuid().describe("Domain ID"),
    enabled: z.boolean().describe("Whether SSO is enabled"),
    metadata: z
      .object({
        acsUrl: z.string().optional(),
        certificate: z.string(),
        entityId: z.string(),
        sloUrl: z.string().optional().nullable(),
        ssoUrl: z.string().optional(),
      })
      .describe("SSO metadata"),
    provider: z.literal("saml").describe("SSO provider"),
  }),
  z.object({
    action: z.literal("delete"),
    domain_id: z.string().uuid().describe("Domain ID"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const manageOrganizationAreasSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    area_name: z.string().describe("Area name"),
    description: z.string().optional().nullable().describe("Area description"),
    parent_area_id: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .describe("Parent area ID"),
    properties: z
      .record(z.any())
      .optional()
      .nullable()
      .describe("Custom area properties"),
    slug: z.string().describe("URL-friendly identifier string"),
  }),
  z.object({
    action: z.literal("update"),
    active: z.boolean().optional().describe("Whether the area is active"),
    area_id: z.string().uuid().describe("Area ID"),
    area_name: z.string().optional().describe("Area name"),
    description: z.string().optional().nullable().describe("Area description"),
    parent_area_id: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .describe("Parent area ID"),
    properties: z
      .record(z.any())
      .optional()
      .nullable()
      .describe("Custom area properties"),
    slug: z.string().optional().describe("URL-friendly identifier string"),
  }),
  z.object({
    action: z.literal("delete"),
    area_id: z.string().uuid().describe("Area ID"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const manageOrganizationMembersSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.string().email().describe("Email to invite"),
    name: z.string().describe("Name of the invited user"),
    role: z.enum(validRoles).describe("Role for the member"),
    username: z.string().optional().describe("Chosen username for the invitee"),
  }),
  z.object({
    action: z.literal("update_role"),
    role: z.enum(validRoles).describe("New role for the member"),
    user_id: z.string().uuid().describe("User ID to modify"),
  }),
  z.object({
    action: z.literal("remove"),
    user_id: z.string().uuid().describe("User ID to remove"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const createOrganizationsTools = (user) => {
  const getActiveOrgId = async () => {
    const org =
      await organizationsRepository.getActiveOrganizationWithMembership(
        user.userId
      );
    if (!org) throw new Error("No active organization found for user.");
    return org.id;
  };

  return {
    manage_organization_areas: {
      description: "Manage organization areas (create, update, delete, list).",
      handler: async (args) => {
        try {
          const {
            action,
            area_id,
            area_name,
            description,
            parent_area_id,
            properties,
            slug,
            active,
          } = args;

          if (action === "list") {
            const organizationId = await getActiveOrgId();
            const result =
              await areasRepository.listOrganizationAreas(organizationId);
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "create") {
            if (!area_name || !slug)
              throw new Error(
                "area_name and slug are required for create action"
              );
            const organizationId = await getActiveOrgId();
            const result = await areasRepository.createArea({
              areaName: area_name,
              createdBy: user.userId,
              description,
              organizationId,
              parentAreaId: parent_area_id,
              properties,
              slug,
            });
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "update") {
            if (!area_id)
              throw new Error("area_id is required for update action");
            const organizationId = await getActiveOrgId();
            const result = await areasRepository.updateArea(
              area_id,
              organizationId,
              { active, areaName: area_name, description, properties, slug }
            );
            if (!result) throw new Error("Area not found or access denied.");
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "delete") {
            if (!area_id)
              throw new Error("area_id is required for delete action");
            const organizationId = await getActiveOrgId();
            const result = await areasRepository.softDeleteArea(
              area_id,
              organizationId
            );
            if (!result) throw new Error("Area not found or access denied.");
            return {
              content: [
                {
                  text: JSON.stringify({ success: true }, null, 2),
                  type: "text",
                },
              ],
            };
          }

          throw new Error(`Invalid action: ${action}`);
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "manage_organization_areas",
      schema: manageOrganizationAreasSchema,
    },

    manage_organization_domains: {
      description:
        "Manage organization domains and SSO (add, update_sso, delete, list).",
      handler: async (args) => {
        try {
          const {
            action,
            domain_id,
            domain_name,
            enabled,
            metadata,
            provider,
          } = args;

          if (action === "list") {
            const organizationId = await getActiveOrgId();
            const result =
              await domainsRepository.listByOrganization(organizationId);
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "add") {
            if (!domain_name)
              throw new Error("domain_name is required for add action");
            const organizationId = await getActiveOrgId();
            const verificationToken = require("crypto").randomUUID();
            const result = await domainsRepository.createDomain({
              domainName: domain_name,
              organizationId,
              verificationToken,
            });
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "update_sso") {
            if (!domain_id || !metadata || !provider)
              throw new Error(
                "domain_id, metadata, and provider are required for update_sso"
              );
            const domain = await domainsRepository.findById(domain_id);
            if (!domain) throw new Error("Domain not found.");
            const organizationId = await getActiveOrgId();
            if (domain.organization_id !== organizationId)
              throw new Error("Domain does not belong to active organization.");
            const result = await domainsRepository.updateSsoSettings(
              domain_id,
              {
                enabled,
                metadata,
                provider,
              }
            );
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "delete") {
            if (!domain_id)
              throw new Error("domain_id is required for delete action");
            const domain = await domainsRepository.findById(domain_id);
            if (!domain) throw new Error("Domain not found.");
            const organizationId = await getActiveOrgId();
            if (domain.organization_id !== organizationId)
              throw new Error("Domain does not belong to active organization.");
            const result = await domainsRepository.deleteDomain(domain_id);
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          throw new Error(`Invalid action: ${action}`);
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "manage_organization_domains",
      schema: manageOrganizationDomainsSchema,
    },

    manage_organization_members: {
      description:
        "Manage organization members (invite, update_role, remove, list).",
      handler: async (args) => {
        try {
          const { action, email, name, role, username, user_id } = args;

          if (action === "list") {
            const organizationId = await getActiveOrgId();
            const result =
              await organizationsRepository.getOrganizationMembers(
                organizationId
              );
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "invite") {
            if (!email || !name)
              throw new Error("email and name are required for invite action");
            const organizationId = await getActiveOrgId();
            const result = await organizationsRepository.createOrgInvite(
              organizationId,
              email,
              role,
              user.userId,
              name,
              username
            );
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "update_role") {
            if (!user_id || !role)
              throw new Error("user_id and role are required for update_role");
            const organizationId = await getActiveOrgId();
            const result =
              await organizationsRepository.updateOrganizationMemberRole(
                organizationId,
                user_id,
                role
              );
            if (!result)
              throw new Error(
                "Member not found, could not be updated, or access denied."
              );
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "remove") {
            if (!user_id)
              throw new Error("user_id is required for remove action");
            const organizationId = await getActiveOrgId();
            const result =
              await organizationsRepository.removeOrganizationMember(
                organizationId,
                user_id
              );
            if (!result)
              throw new Error(
                "Member not found, could not be removed, or access denied."
              );
            return {
              content: [
                {
                  text: JSON.stringify({ success: true }, null, 2),
                  type: "text",
                },
              ],
            };
          }

          throw new Error(`Invalid action: ${action}`);
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "manage_organization_members",
      schema: manageOrganizationMembersSchema,
    },

    manage_organizations: {
      description: "Manage the active organization (get_active, update).",
      handler: async (args) => {
        try {
          const {
            action,
            banner_url,
            description,
            logo_url,
            org_name,
            settings,
            unique_name,
          } = args;

          if (action === "get_active") {
            const org =
              await organizationsRepository.getActiveOrganizationWithMembership(
                user.userId
              );
            if (!org)
              return {
                content: [
                  { text: "No active organization found.", type: "text" },
                ],
              };
            return {
              content: [{ text: JSON.stringify(org, null, 2), type: "text" }],
            };
          }

          if (action === "update") {
            const organizationId = await getActiveOrgId();
            const result = await organizationsRepository.updateOrganization(
              organizationId,
              {
                banner_url,
                description,
                logo_url,
                org_name,
                settings,
                unique_name,
              }
            );
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          throw new Error(`Invalid action: ${action}`);
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "manage_organizations",
      schema: manageOrganizationsSchema,
    },
  };
};

module.exports = {
  createOrganizationsTools,
};
