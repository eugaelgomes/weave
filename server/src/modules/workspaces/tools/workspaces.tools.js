const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const { z } = require("zod");

const { validRoles } = require("@/modules/workspaces/normalizer");

const manageWorkspacesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    banner_url: z.string().url().optional().nullable().describe("Workspace banner image URL"),
    description: z.string().optional().nullable().describe("Workspace description"),
    logo_url: z.string().url().optional().nullable().describe("Workspace logo image URL"),
    settings: z.record(z.any()).optional().nullable().describe("Workspace settings"),
    unique_name: z
      .string()
      .optional()
      .nullable()
      .describe("Globally unique identifier string for the workspace"),
    workspace_name: z.string().optional().describe("Workspace name"),
  }),
  z.object({
    action: z.literal("get_active"),
  }),
]);

const manageWorkspaceDomainsSchema = z.discriminatedUnion("action", [
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

const manageWorkspaceTeamsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    description: z.string().optional().nullable().describe("Team description"),
    parent_team_id: z.string().uuid().optional().nullable().describe("Parent team ID"),
    properties: z.record(z.any()).optional().nullable().describe("Custom team properties"),
    slug: z.string().describe("URL-friendly identifier string"),
    team_name: z.string().describe("Team name"),
  }),
  z.object({
    action: z.literal("update"),
    active: z.boolean().optional().describe("Whether the team is active"),
    description: z.string().optional().nullable().describe("Team description"),
    parent_team_id: z.string().uuid().optional().nullable().describe("Parent team ID"),
    properties: z.record(z.any()).optional().nullable().describe("Custom team properties"),
    slug: z.string().optional().describe("URL-friendly identifier string"),
    team_id: z.string().uuid().describe("Team ID"),
    team_name: z.string().optional().describe("Team name"),
  }),
  z.object({
    action: z.literal("delete"),
    team_id: z.string().uuid().describe("Team ID"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const manageWorkspaceMembersSchema = z.discriminatedUnion("action", [
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

const createWorkspacesTools = (user) => {
  const getActiveWorkspaceId = async () => {
    const workspace = await baseRepository.getActiveWorkspaceWithMembership(user.userId);
    if (!workspace) throw new Error("No active workspace found for user.");
    return workspace.id;
  };

  return {
    manage_workspace_domains: {
      description: "Manage workspace domains and SSO (add, update_sso, delete, list).",
      handler: async (args) => {
        try {
          const { action, domain_name, enabled, metadata, provider } = args;
          const workspaceId = await getActiveWorkspaceId();
          const settings = await settingsRepository.getSettings(workspaceId);
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
            await settingsRepository.updateDomains(workspaceId, domains);
            return {
              content: [{ text: JSON.stringify(newDomain, null, 2), type: "text" }],
            };
          }

          if (action === "update_sso") {
            if (!domain_name || !metadata || !provider)
              throw new Error("domain_name, metadata, and provider are required for update_sso");

            const domain = domains.find((d) => d.domain_name === domain_name);
            if (!domain) throw new Error("Domain not found.");

            await settingsRepository.updateSAML(workspaceId, {
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
            await settingsRepository.updateDomains(workspaceId, domains);
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
      name: "manage_workspace_domains",
      schema: manageWorkspaceDomainsSchema,
    },

    manage_workspace_members: {
      description: "Manage workspace members (invite, update_role, remove, list).",
      handler: async (args) => {
        try {
          const { action, email, name, role, username, user_id } = args;

          if (action === "list") {
            const workspaceId = await getActiveWorkspaceId();
            const result = await membersRepository.getWorkspaceMembers(workspaceId);
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "invite") {
            if (!email || !name) throw new Error("email and name are required for invite action");
            const workspaceId = await getActiveWorkspaceId();
            const result = await membersRepository.createWorkspaceInvite(
              workspaceId,
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
            const workspaceId = await getActiveWorkspaceId();
            const result = await workspacesRepository.updateWorkspaceMemberRole(
              workspaceId,
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
            const workspaceId = await getActiveWorkspaceId();
            const result = await membersRepository.removeWorkspaceMember(workspaceId, user_id);
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
      name: "manage_workspace_members",
      schema: manageWorkspaceMembersSchema,
    },

    manage_workspace_teams: {
      description: "Manage workspace teams (create, update, delete, list).",
      handler: async (args) => {
        try {
          const {
            action,
            team_id,
            team_name,
            description,
            parent_team_id,
            properties,
            slug,
            active,
          } = args;

          if (action === "list") {
            const workspaceId = await getActiveWorkspaceId();
            const result = await teamsRepository.listWorkspaceTeams(workspaceId);
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "create") {
            if (!team_name || !slug)
              throw new Error("team_name and slug are required for create action");
            const workspaceId = await getActiveWorkspaceId();
            const result = await teamsRepository.createArea({
              createdBy: user.userId,
              description,
              parentTeamId: parent_team_id,
              properties,
              slug,
              teamName: team_name,
              workspaceId,
            });
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "update") {
            if (!team_id) throw new Error("team_id is required for update action");
            const workspaceId = await getActiveWorkspaceId();
            const result = await teamsRepository.updateArea(team_id, workspaceId, {
              active,
              description,
              properties,
              slug,
              teamName: team_name,
            });
            if (!result) throw new Error("Team not found or access denied.");
            return {
              content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
            };
          }

          if (action === "delete") {
            if (!team_id) throw new Error("team_id is required for delete action");
            const workspaceId = await getActiveWorkspaceId();
            const result = await teamsRepository.softDeleteArea(team_id, workspaceId);
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
      name: "manage_workspace_teams",
      schema: manageWorkspaceTeamsSchema,
    },

    manage_workspaces: {
      description: "Manage the active workspace (get_active, update).",
      handler: async (args) => {
        try {
          const {
            action,
            banner_url,
            description,
            logo_url,
            workspace_name,
            settings,
            unique_name,
          } = args;

          if (action === "get_active") {
            const workspace = await baseRepository.getActiveWorkspaceWithMembership(user.userId);
            if (!workspace)
              return {
                content: [{ text: "No active workspace found.", type: "text" }],
              };
            return {
              content: [{ text: JSON.stringify(workspace, null, 2), type: "text" }],
            };
          }

          if (action === "update") {
            const workspaceId = await getActiveWorkspaceId();
            const result = await workspacesRepository.updateWorkspace(workspaceId, {
              banner_url,
              description,
              logo_url,
              settings,
              unique_name,
              workspace_name,
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
      name: "manage_workspaces",
      schema: manageWorkspacesSchema,
    },
  };
};

module.exports = {
  createWorkspacesTools,
};
