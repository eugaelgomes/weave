const { z } = require("zod");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const domainsRepository = require("@/modules/organizations/repositories/domains.repository");
const { validRoles } = require("@/modules/organizations/normalizer");

const emptySchema = z.object({});

const updateOrganizationSchema = z.object({
  banner_url: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .nullable()
    .describe(
      "The URL of the organization's banner image. Must be a valid URL."
    ),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the organization."),
  logo_url: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .nullable()
    .describe("The URL of the organization's logo image. Must be a valid URL."),
  org_name: z
    .string()
    .trim()
    .min(1, "org_name cannot be empty")
    .optional()
    .describe("The display name of the organization."),
  settings: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for the organization settings."),
  unique_name: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A globally unique identifier string for the organization."),
});

const createOrganizationAreaSchema = z.object({
  area_name: z
    .string()
    .trim()
    .min(1, "area_name is required")
    .describe("The display name of the area."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the area."),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable()
    .describe(
      "The universally unique identifier of the parent area, if this is a sub-area."
    ),
  properties: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for custom area properties."),
  slug: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A URL-friendly identifier string for the area."),
});

const updateOrganizationAreaSchema = z.object({
  active: z
    .boolean()
    .optional()
    .describe("Indicates whether the area is active."),
  area_name: z
    .string()
    .trim()
    .min(1, "area_name cannot be empty")
    .optional()
    .describe("The display name of the area."),
  areaId: z
    .string()
    .uuid()
    .describe("The universally unique identifier of the area to update."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the area."),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable()
    .describe(
      "The universally unique identifier of the parent area, if this is a sub-area."
    ),
  properties: z
    .record(z.any())
    .optional()
    .describe("A configuration object for custom area properties."),
  slug: z
    .string()
    .trim()
    .optional()
    .describe("A URL-friendly identifier string for the area."),
});

const deleteOrganizationAreaSchema = z.object({
  areaId: z
    .string()
    .uuid()
    .describe("The universally unique identifier of the area to delete."),
});

const inviteOrganizationMemberSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .describe("The email address of the user to invite."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .describe("The full name of the user to invite."),
  role: z
    .enum(validRoles)
    .optional()
    .default("MEMBER")
    .describe(
      "The role of the member in the organization. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
  username: z
    .string()
    .trim()
    .optional()
    .describe("The chosen username for the invited user."),
});

const updateOrganizationMemberRoleSchema = z.object({
  role: z
    .enum(validRoles)
    .describe(
      "The role of the member in the organization. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST."
    ),
  userId: z
    .string()
    .uuid()
    .describe("The universally unique identifier of the user to update."),
});

const removeOrganizationMemberSchema = z.object({
  userId: z
    .string()
    .uuid()
    .describe(
      "The universally unique identifier of the user to remove from the organization."
    ),
});

const createOrganizationDomainSchema = z.object({
  domain_name: z
    .string()
    .trim()
    .min(1, "domain_name is required")
    .describe("The fully qualified domain name."),
});

const updateSsoSettingsSchema = z.object({
  domainId: z
    .string()
    .uuid()
    .describe("The universally unique identifier of the domain."),
  enabled: z
    .boolean()
    .optional()
    .describe("Indicates whether Single Sign-On is enabled for this domain."),
  metadata: z
    .object({
      acsUrl: z
        .string()
        .trim()
        .optional()
        .describe(
          "The Assertion Consumer Service URL for the Single Sign-On provider."
        ),
      certificate: z
        .string()
        .trim()
        .min(1, "certificate is required")
        .describe(
          "The public certificate provided by the Single Sign-On Identity Provider."
        ),
      entityId: z
        .string()
        .trim()
        .min(1, "entityId is required")
        .describe(
          "The Entity Identifier for the Single Sign-On Identity Provider."
        ),
      sloUrl: z
        .string()
        .trim()
        .optional()
        .nullable()
        .describe("The Single Logout URL for the Single Sign-On provider."),
      ssoUrl: z
        .string()
        .trim()
        .optional()
        .describe("The Single Sign-On login URL."),
    })
    .describe("A configuration object containing the Single Sign-On metadata."),
  provider: z
    .literal("saml")
    .describe("The Single Sign-On provider type. Only saml is supported."),
});

const deleteDomainSchema = z.object({
  domainId: z
    .string()
    .uuid()
    .describe("The universally unique identifier of the domain to delete."),
});

/**
 * Creates the Organizations tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The organization tools definition map.
 */
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
    add_organization_domain: {
      description: "Adds a new domain to the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const verificationToken = require("crypto").randomUUID();
          const result = await domainsRepository.createDomain({
            domainName: args.domain_name,
            organizationId,
            verificationToken,
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "add_organization_domain",
      schema: createOrganizationDomainSchema,
    },
    create_organization_area: {
      description: "Creates a new area in the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const result = await areasRepository.createArea({
            areaName: args.area_name,
            createdBy: user.userId,
            description: args.description,
            organizationId,
            parentAreaId: args.parent_area_id,
            properties: args.properties,
            slug: args.slug,
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "create_organization_area",
      schema: createOrganizationAreaSchema,
    },
    delete_organization_area: {
      description: "Soft deletes an area from the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const result = await areasRepository.softDeleteArea(
            args.areaId,
            organizationId
          );
          if (!result) {
            return {
              content: [
                { text: "Area not found or access denied.", type: "text" },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                text: JSON.stringify({ success: true }, null, 2),
                type: "text",
              },
            ],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "delete_organization_area",
      schema: deleteOrganizationAreaSchema,
    },
    delete_organization_domain: {
      description: "Deletes a domain from the active organization",
      handler: async (args) => {
        try {
          const domain = await domainsRepository.findById(args.domainId);
          if (!domain) {
            return {
              content: [{ text: "Domain not found.", type: "text" }],
              isError: true,
            };
          }
          const result = await domainsRepository.deleteDomain(args.domainId);
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "delete_organization_domain",
      schema: deleteDomainSchema,
    },
    get_active_organization: {
      description:
        "Gets the active organization and membership role for the current user",
      handler: async () => {
        try {
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
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "get_active_organization",
      schema: emptySchema,
    },
    invite_organization_member: {
      description:
        "Creates an invite for a new member to join the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const result = await organizationsRepository.createOrgInvite(
            organizationId,
            args.email,
            args.role,
            user.userId,
            args.name,
            args.username
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "invite_organization_member",
      schema: inviteOrganizationMemberSchema,
    },
    list_organization_areas: {
      description: "Lists all areas in the active organization",
      handler: async () => {
        try {
          const organizationId = await getActiveOrgId();
          const result =
            await areasRepository.listOrganizationAreas(organizationId);
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "list_organization_areas",
      schema: emptySchema,
    },
    list_organization_domains: {
      description: "Lists all domains for the active organization",
      handler: async () => {
        try {
          const organizationId = await getActiveOrgId();
          const result =
            await domainsRepository.listByOrganization(organizationId);
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "list_organization_domains",
      schema: emptySchema,
    },
    list_organization_members: {
      description: "Lists all members of the active organization",
      handler: async () => {
        try {
          const organizationId = await getActiveOrgId();
          const result =
            await organizationsRepository.getOrganizationMembers(
              organizationId
            );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "list_organization_members",
      schema: emptySchema,
    },
    remove_organization_member: {
      description: "Removes a member from the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const result = await organizationsRepository.removeOrganizationMember(
            organizationId,
            args.userId
          );
          if (!result) {
            return {
              content: [
                {
                  text: "Member not found, could not be removed, or access denied.",
                  type: "text",
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                text: JSON.stringify({ success: true }, null, 2),
                type: "text",
              },
            ],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "remove_organization_member",
      schema: removeOrganizationMemberSchema,
    },
    update_organization: {
      description: "Updates the active organization's details",
      handler: async (args) => {
        try {
          const org =
            await organizationsRepository.getActiveOrganizationWithMembership(
              user.userId
            );
          if (!org) throw new Error("No active organization found for user.");

          const result = await organizationsRepository.updateOrg(
            org.id,
            user.userId,
            args.org_name !== undefined ? args.org_name : org.org_name,
            args.unique_name !== undefined ? args.unique_name : org.unique_name,
            args.logo_url !== undefined ? args.logo_url : org.logo_url,
            args.banner_url !== undefined ? args.banner_url : org.banner_url,
            args.description !== undefined ? args.description : org.description,
            args.settings !== undefined ? args.settings : org.settings,
            org.deleted
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "update_organization",
      schema: updateOrganizationSchema,
    },
    update_organization_area: {
      description: "Updates an area in the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const fields = {};
          if (args.area_name !== undefined) fields.area_name = args.area_name;
          if (args.slug !== undefined) fields.slug = args.slug;
          if (args.description !== undefined)
            fields.description = args.description;
          if (args.properties !== undefined)
            fields.properties = args.properties;
          if (args.active !== undefined) fields.active = args.active;
          if (args.parent_area_id !== undefined)
            fields.parent_area_id = args.parent_area_id;

          const result = await areasRepository.updateArea(
            args.areaId,
            organizationId,
            fields
          );
          if (!result) {
            return {
              content: [
                { text: "Area not found or access denied.", type: "text" },
              ],
              isError: true,
            };
          }
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "update_organization_area",
      schema: updateOrganizationAreaSchema,
    },
    update_organization_domain_sso: {
      description: "Updates Single Sign-On (SSO) configuration for a domain",
      handler: async (args) => {
        try {
          const result = await domainsRepository.updateSsoConfiguration(
            args.domainId,
            {
              enabled: args.enabled,
              metadata: args.metadata,
              provider: args.provider,
            }
          );
          if (!result) {
            return {
              content: [{ text: "Domain not found.", type: "text" }],
              isError: true,
            };
          }
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "update_organization_domain_sso",
      schema: updateSsoSettingsSchema,
    },
    update_organization_member_role: {
      description: "Updates a member's role in the active organization",
      handler: async (args) => {
        try {
          const organizationId = await getActiveOrgId();
          const result = await organizationsRepository.updateMemberRole(
            organizationId,
            args.userId,
            args.role
          );
          if (!result) {
            return {
              content: [
                {
                  text: "Member not found or could not be updated.",
                  type: "text",
                },
              ],
              isError: true,
            };
          }
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        } catch (error) {
          return {
            content: [{ text: `Error: ${error.message}`, type: "text" }],
            isError: true,
          };
        }
      },
      name: "update_organization_member_role",
      schema: updateOrganizationMemberRoleSchema,
    },
  };
};

module.exports = {
  createOrganizationsTools,
};
