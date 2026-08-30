const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const { z } = require("zod");



const { validRoles } = require("@/modules/workspaces/normalizer");

const manageOrganizationsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    banner_url: z.string().url().optional().nullable().describe("Workspace banner image URL"),
    description: z.string().optional().nullable().describe("Workspace description"),
    logo_url: z.string().url().optional().nullable().describe("Workspace logo image URL"),
    org_name: z.string().optional().describe("Workspace name"),
    settings: z.record(z.any()).optional().nullable().describe("Workspace settings"),
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
    domain_name: z.string().describe("Domain name"),
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
    domain_name: z.string().describe("Domain name"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const manageOrganizationAreasSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    area_name: z.string().describe("Team name"),
    description: z.string().optional().nullable().describe("Team description"),
    parent_area_id: z.string().uuid().optional().nullable().describe("Parent team ID"),
    properties: z.record(z.any()).optional().nullable().describe("Custom team properties"),
    slug: z.string().describe("URL-friendly identifier string"),
  }),
  z.object({
    action: z.literal("update"),
    active: z.boolean().optional().describe("Whether the team is active"),
    area_id: z.string().uuid().describe("Team ID"),
    area_name: z.string().optional().describe("Team name"),
    description: z.string().optional().nullable().describe("Team description"),
    parent_area_id: z.string().uuid().optional().nullable().describe("Parent team ID"),
    properties: z.record(z.any()).optional().nullable().describe("Custom team properties"),
    slug: z.string().optional().describe("URL-friendly identifier string"),
  }),
  z.object({
    action: z.literal("delete"),
    area_id: z.string().uuid().describe("Team ID"),
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
    const org = await baseRepository.getActiveOrganizationWithMembership(user.userId);
    if (!org) throw new Error("No active workspace found for user.");
    return org.id;
  };

  return {
    manage_organization_areas: {
      description: "Manage workspace teams (create, update, delete, list).",
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
            const result = await teamsRepository.listOrganizationAreas(organizationId);
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "create") {
            if (!area_name || !slug)
              throw new Error("area_name and slug are required for create action");
            const organizationId = await getActiveOrgId();
            const result = await teamsRepository.createArea({
              areaName: area_name,
              createdBy: user.userId,
              description,
              organizationId,
              parentAreaId: parent_area_id,
              properties,
              slug,
            });
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "update") {
            if (!area_id) throw new Error("area_id is required for update action");
            const organizationId = await getActiveOrgId();
            const result = await teamsRepository.updateArea(area_id, organizationId, {
              active,
              areaName: area_name,
              description,
              properties,
              slug,
            });
            if (!result) throw new Error("Team not found or access denied.");
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "delete") {
            if (!area_id) throw new Error("area_id is required for delete action");
            const organizationId = await getActiveOrgId();
            const result = await teamsRepository.softDeleteArea(area_id, organizationId);
            if (!result) throw new Error("Team not found or access denied.");
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
      description: "Manage workspace domains and SSO (add, update_sso, delete, list).",
      handler: async (args) => {
        try {
          const { action, domain_name, enabled, metadata, provider } = args;
          const organizationId = await getActiveOrgId();
          const settings = await settingsRepository.getSettings(organizationId);
          const domains = settings?.domains || [];

          if (action === "list") {
            return {
              content: [{ text: JSON.stringify(domains, null, 2), type: "text" }],
            };
          }

          if (action === "add") {
            if (!domain_name) throw new Error("domain_name is required for add action");
            if (domains.find((d) => d.domain_name === domain_name)) {
              throw new Error("Domain already registered.");
            }
            const verificationToken = require("crypto").randomBytes(24).toString("hex");
            const newDomain = {
              created_at: new Date().toISOString(),
              domain_name,
              status: "PENDING",
              verification_token: `weave-domain-verification=${verificationToken}`,
            };
            domains.push(newDomain);
            await settingsRepository.updateDomains(organizationId, domains);
            return {
              content: [{ text: JSON.stringify(newDomain, null, 2), type: "text" }],
            };
          }

          if (action === "update_sso") {
            if (!domain_name || !metadata || !provider)
              throw new Error("domain_name, metadata, and provider are required for update_sso");
            
            const domain = domains.find((d) => d.domain_name === domain_name);
            if (!domain) throw new Error("Domain not found.");

            await settingsRepository.updateSAML(organizationId, {
              enabled,
              metadata,
              provider,
            });
            return {
              content: [{ text: "SSO settings updated successfully.", type: "text" }],
            };
          }

          if (action === "delete") {
            if (!domain_name) throw new Error("domain_name is required for delete action");
            const domainIndex = domains.findIndex((d) => d.domain_name === domain_name);
            if (domainIndex === -1) throw new Error("Domain not found.");
            
            domains.splice(domainIndex, 1);
            await settingsRepository.updateDomains(organizationId, domains);
            return {
              content: [{ text: "Domain deleted successfully.", type: "text" }],
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
      description: "Manage workspace members (invite, update_role, remove, list).",
      handler: async (args) => {
        try {
          const { action, email, name, role, username, user_id } = args;

          if (action === "list") {
            const organizationId = await getActiveOrgId();
            const result = await membersRepository.getOrganizationMembers(organizationId);
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "invite") {
            if (!email || !name) throw new Error("email and name are required for invite action");
            const organizationId = await getActiveOrgId();
            const result = await membersRepository.createOrgInvite(
              organizationId,
              email,
              role,
              user.userId,
              name,
              username
            );
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "update_role") {
            if (!user_id || !role) throw new Error("user_id and role are required for update_role");
            const organizationId = await getActiveOrgId();
            const result = await organizationsRepository.updateOrganizationMemberRole(
              organizationId,
              user_id,
              role
            );
            if (!result)
              throw new Error("Member not found, could not be updated, or access denied.");
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "remove") {
            if (!user_id) throw new Error("user_id is required for remove action");
            const organizationId = await getActiveOrgId();
            const result = await membersRepository.removeOrganizationMember(
              organizationId,
              user_id
            );
            if (!result)
              throw new Error("Member not found, could not be removed, or access denied.");
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
      description: "Manage the active workspace (get_active, update).",
      handler: async (args) => {
        try {
          const { action, banner_url, description, logo_url, org_name, settings, unique_name } =
            args;

          if (action === "get_active") {
            const org = await baseRepository.getActiveOrganizationWithMembership(
              user.userId
            );
            if (!org)
              return {
                content: [{ text: "No active workspace found.", type: "text" }],
              };
            return {
              content: [{ text: JSON.stringify(org, null, 2), type: "text" }],
            };
          }

          if (action === "update") {
            const organizationId = await getActiveOrgId();
            const result = await organizationsRepository.updateOrganization(organizationId, {
              banner_url,
              description,
              logo_url,
              org_name,
              settings,
              unique_name,
            });
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
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
