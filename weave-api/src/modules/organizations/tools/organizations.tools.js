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
    domainId: z.string().uuid().describe("Domain ID"),
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
    domainId: z.string().uuid().describe("Domain ID"),
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
    area_name: z.string().optional().describe("Area name"),
    areaId: z.string().uuid().describe("Area ID"),
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
    areaId: z.string().uuid().describe("Area ID"),
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
    userId: z.string().uuid().describe("User ID to modify"),
  }),
  z.object({
    action: z.literal("remove"),
    userId: z.string().uuid().describe("User ID to remove"),
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
            areaId,
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
            if (!areaId)
              throw new Error("areaId is required for update action");
            const organizationId = await getActiveOrgId();
            const result = await areasRepository.updateArea(
              areaId,
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
            if (!areaId)
              throw new Error("areaId is required for delete action");
            const organizationId = await getActiveOrgId();
            const result = await areasRepository.softDeleteArea(
              areaId,
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
          const { action, domainId, domain_name, enabled, metadata, provider } =
            args;

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
            if (!domainId || !metadata || !provider)
              throw new Error(
                "domainId, metadata, and provider are required for update_sso"
              );
            const domain = await domainsRepository.findById(domainId);
            if (!domain) throw new Error("Domain not found.");
            const organizationId = await getActiveOrgId();
            if (domain.organization_id !== organizationId)
              throw new Error("Domain does not belong to active organization.");
            const result = await domainsRepository.updateSsoSettings(domainId, {
              enabled,
              metadata,
              provider,
            });
            return {
              content: [
                { text: JSON.stringify(result, null, 2), type: "text" },
              ],
            };
          }

          if (action === "delete") {
            if (!domainId)
              throw new Error("domainId is required for delete action");
            const domain = await domainsRepository.findById(domainId);
            if (!domain) throw new Error("Domain not found.");
            const organizationId = await getActiveOrgId();
            if (domain.organization_id !== organizationId)
              throw new Error("Domain does not belong to active organization.");
            const result = await domainsRepository.deleteDomain(domainId);
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
          const { action, email, name, role, username, userId } = args;

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
            if (!userId || !role)
              throw new Error("userId and role are required for update_role");
            const organizationId = await getActiveOrgId();
            const result =
              await organizationsRepository.updateOrganizationMemberRole(
                organizationId,
                userId,
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
            if (!userId)
              throw new Error("userId is required for remove action");
            const organizationId = await getActiveOrgId();
            const result =
              await organizationsRepository.removeOrganizationMember(
                organizationId,
                userId
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
