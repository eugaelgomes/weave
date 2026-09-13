const { prisma } = require("@theweave/database");

/**
 * @typedef {Object} SAMLSettings
 * @property {string} [idp_entity_id] - Identity Provider Entity ID
 * @property {string} [sso_url] - Single Sign-On URL
 * @property {string} [x509cert] - X.509 Certificate
 * @property {boolean} [enabled] - Whether SAML is enabled
 */

/**
 * @typedef {Object} DomainSetting
 * @property {string} domain_name - Domain name (e.g., example.com)
 * @property {string} status - Verification status (VERIFIED, PENDING)
 */

/**
 * @typedef {Object} WorkspaceSettingsUpdates
 * @property {SAMLSettings} [saml] - SAML configuration
 * @property {DomainSetting[]} [domains] - Allowed domains
 * @property {Record<string, any>} [tracing] - Tracing settings
 * @property {Record<string, any>} [branding] - Branding settings
 * @property {Record<string, any>} [preferences] - Workspace preferences
 * @property {Record<string, any>} [integrations] - Integration settings
 */

/**
 * @typedef {Object} SystemSettingsUpdates
 * @property {Record<string, any>} [smtp_config] - SMTP configuration
 * @property {Record<string, any>} [ai_global_config] - Global AI configuration
 * @property {Record<string, any>} [instance_branding] - Instance branding
 */

/**
 * Repository responsible for workspace and system-wide settings, utilizing Prisma ORM.
 */
class WorkspaceSettingsRepository {
  /**
   * Retrieves settings for a specific workspace.
   *
   * @param {string} workspaceId - Workspace UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings | null>}
   */
  async getSettings(workspaceId, client = prisma) {
    return await client.workspace_settings.findFirst({
      where: {
        deleted: false,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * Creates default settings for a newly created workspace.
   *
   * @param {string} workspaceId - Workspace UUID.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings>}
   */
  async createDefaultSettings(workspaceId, client = prisma) {
    return await client.workspace_settings.create({
      data: {
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * Updates SAML configuration for a workspace.
   *
   * @param {string} workspaceId - Workspace UUID.
   * @param {SAMLSettings} samlData - SAML configuration object.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings>}
   */
  async updateSAML(workspaceId, samlData, client = prisma) {
    return await client.workspace_settings
      .updateMany({
        data: {
          saml: samlData,
          updated_at: new Date(),
        },
        where: { deleted: false, workspace_id: workspaceId },
      })
      .then(() => this.getSettings(workspaceId, client));
  }

  /**
   * Updates allowed domains configuration for a workspace.
   *
   * @param {string} workspaceId - Workspace UUID.
   * @param {DomainSetting[]} domainsData - List of domains.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings>}
   */
  async updateDomains(workspaceId, domainsData, client = prisma) {
    return await client.workspace_settings
      .updateMany({
        data: {
          domains: domainsData,
          updated_at: new Date(),
        },
        where: { deleted: false, workspace_id: workspaceId },
      })
      .then(() => this.getSettings(workspaceId, client));
  }

  /**
   * Dynamically updates specified workspace settings.
   *
   * @param {string} workspaceId - Workspace UUID.
   * @param {WorkspaceSettingsUpdates} settingsData - Settings to update.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings | null>}
   */
  async updateSettings(workspaceId, settingsData, client = prisma) {
    const data = {};
    const allowedFields = ["saml", "domains", "tracing", "branding", "preferences", "integrations"];

    for (const [key, value] of Object.entries(settingsData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) return this.getSettings(workspaceId, client);

    data.updated_at = new Date();

    await client.workspace_settings.updateMany({
      data,
      where: { deleted: false, workspace_id: workspaceId },
    });

    return this.getSettings(workspaceId, client);
  }

  /**
   * Finds workspace settings by a verified domain name.
   * Utilizes raw query due to complex JSONB array inspection.
   *
   * @param {string} domainName - The domain to search for (e.g. 'example.com')
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').workspace_settings | null>}
   */
  async findByDomain(domainName, client = prisma) {
    return await client.workspace_settings.findFirst({
      where: {
        deleted: false,
        domains: {
          array_contains: [{ domain_name: domainName, status: "VERIFIED" }],
        },
      },
    });
  }

  /**
   * Checks if a domain name is already restricted (verified or pending) by any workspace.
   * Utilizes raw query due to complex JSONB array inspection.
   *
   * @param {string} domainName - The domain to check.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<boolean>}
   */
  async isDomainRestricted(domainName, client = prisma) {
    const setting = await client.workspace_settings.findFirst({
      select: { workspace_id: true },
      where: {
        deleted: false,
        OR: [
          { domains: { array_contains: [{ domain_name: domainName, status: "VERIFIED" }] } },
          { domains: { array_contains: [{ domain_name: domainName, status: "PENDING" }] } },
        ],
      },
    });
    return !!setting;
  }

  /**
   * Updates workspace basic identity info (name, urls, etc), enforcing permissions.
   *
   * @param {string} workspace_id - Workspace UUID.
   * @param {string} user_id - The acting user's UUID.
   * @param {Object} details - Updates to apply.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<any>}
   */
  async updateCreationIdentityStep(
    workspace_id,
    user_id,
    { workspace_name, unique_name, logo_url, banner_url, description, country },
    client = prisma
  ) {
    const hasAccess = await client.workspaces.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { user_id },
          {
            workspace_members: {
              some: {
                deleted: false,
                user_id,
                workspace_member_roles: {
                  some: {
                    workspace_roles: {
                      permissions: { array_contains: "manage_workspace" },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) return null;

    const updatedWorkspace = await client.workspaces.update({
      data: {
        banner_url,
        country,
        description,
        logo_url,
        unique_name,
        updated_at: new Date(),
        workspace_name,
      },
      where: { id: workspace_id },
    });

    // Attach plan_snapshot placeholder to maintain return signature
    return {
      ...updatedWorkspace,
      plan_snapshot: null,
    };
  }

  /**
   * Updates workspace configuration (e.g. plan assignment), enforcing permissions.
   *
   * @param {string} workspace_id - Workspace UUID.
   * @param {string} user_id - The acting user's UUID.
   * @param {Object} details - Configuration updates.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<any>}
   */
  async updateCreationConfigurationStep(workspace_id, user_id, { plan_id }, client = prisma) {
    const hasAccess = await client.workspaces.findFirst({
      where: {
        id: workspace_id,
        OR: [
          { user_id },
          {
            workspace_members: {
              some: {
                deleted: false,
                OR: [
                  {
                    workspace_member_roles: {
                      some: {
                        workspace_roles: {
                          permissions: { array_contains: "manage_workspace" },
                        },
                      },
                    },
                  },
                  {
                    workspace_member_roles: {
                      some: {
                        workspace_roles: {
                          permissions: { array_contains: "manage_billing" },
                        },
                      },
                    },
                  },
                ],
                user_id,
              },
            },
          },
        ],
      },
    });

    if (!hasAccess) return null;

    const updatedWorkspace = await client.workspaces.update({
      data: {
        plan_id,
        updated_at: new Date(),
      },
      where: { id: workspace_id },
    });

    // Attach plan_snapshot placeholder to maintain return signature
    return {
      ...updatedWorkspace,
      plan_snapshot: null,
    };
  }

  // --- SYSTEM SETTINGS ---

  /**
   * Retrieves system-wide settings.
   *
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').system_settings>}
   */
  async getSystemSettings(client = prisma) {
    const record = await client.system_settings.findUnique({
      where: { id: 1 },
    });
    if (!record) {
      return this.initializeSystemSettings(client);
    }
    return record;
  }

  /**
   * Initializes system-wide settings if not present.
   *
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').system_settings>}
   */
  async initializeSystemSettings(client = prisma) {
    const defaultData = {
      ai_global_config: {},
      instance_branding: {},
      smtp_config: {},
    };

    return await client.system_settings.upsert({
      create: {
        id: 1,
        ...defaultData,
      },
      update: {},
      where: { id: 1 },
    });
  }

  /**
   * Dynamically updates specified system settings.
   *
   * @param {SystemSettingsUpdates} updates - System settings to update.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').system_settings>}
   */
  async updateSystemSettings(updates, client = prisma) {
    const data = {};
    const allowedFields = ["smtp_config", "ai_global_config", "instance_branding"];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) return this.getSystemSettings(client);

    data.updated_at = new Date();

    return await client.system_settings.update({
      data,
      where: { id: 1 },
    });
  }
}

module.exports = new WorkspaceSettingsRepository();
