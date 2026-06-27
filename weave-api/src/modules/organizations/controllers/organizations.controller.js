const { AppError, fromUnknown, ERROR_CODES } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const spacesService = require("@/services/storage");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const {
  normalizeOrganizationName,
  generateUniqueOrganizationName,
  orgDataResponse,
} = require("../normalizer");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");

/**
 * Controller for organization management.
 * Handles organization lifecycle, branding assets, and organization projects.
 */
class OrganizationsController extends OrganizationsBaseController {
  /**
   * Initialize controller dependencies.
   */
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  /**
   * Generate a unique area slug inside an organization.
   * @param {string|number} organizationId - Organization identifier
   * @param {string} slugBase - Base slug to test
   * @returns {Promise<string|null>} Unique slug or null when base is empty
   */
  async _generateUniqueAreaSlug(organizationId, slugBase) {
    if (!slugBase) {
      return null;
    }

    const existingSlugs = await this.areasRepository.getMatchingSlugs(
      organizationId,
      slugBase
    );

    if (!existingSlugs.includes(slugBase)) {
      return slugBase;
    }

    let counter = 1;
    let candidate = `${slugBase}-${counter}`;
    while (existingSlugs.includes(candidate)) {
      counter += 1;
      candidate = `${slugBase}-${counter}`;
    }

    return candidate;
  }

  /**
   * Create the default area for a newly created organization.
   * @param {Object} organization - Newly created organization data
   * @param {string|number} createdBy - User id who creates the default area
   * @returns {Promise<void>}
   */
  async _createDefaultOrganizationArea(organization, createdBy) {
    const defaultName = "Area Central";
    const slugBase =
      organization.unique_name || normalizeOrganizationName(defaultName);
    try {
      const uniqueSlug = await this._generateUniqueAreaSlug(
        organization.id,
        slugBase
      );

      const newArea = await this.areasRepository.createArea({
        organizationId: organization.id,
        parentAreaId: null,
        areaName: defaultName,
        slug: uniqueSlug || `${slugBase}-${organization.id}`,
        description: `Main area for organization ${organization.org_name}`,
        properties: { system: true },
        createdBy,
      });

      await this.areasRepository.addAreaMember(
        newArea.id,
        organization.id,
        createdBy,
        ORG_ROLES.ADMIN,
        createdBy
      );
    } catch (error) {
      console.error("Error creating default organization area:", error);
      throw new Error("Failed to create the default central organization area");
    }
  }

  /**
   * Create a new organization for the authenticated user.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with created organization data or error
   */
  async createOrganization(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const existingOrg = await this._getUserOrganization(userId);
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          error: "User already has an organization. Use PUT to update it.",
        });
      }

      const {
        org_name,
        unique_name: providedUniqueName,
        logo_url,
        banner_url,
        description,
        settings,
      } = req.body;

      let unique_name;
      if (providedUniqueName) {
        unique_name = normalizeOrganizationName(providedUniqueName);
        if (!unique_name) {
          throw new Error(
            "Provided unique name is invalid after normalization"
          );
        }

        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(unique_name);
        if (existingNames.includes(unique_name)) {
          throw new Error(`Unique name '${unique_name}' is already in use`);
        }
      } else {
        unique_name = await generateUniqueOrganizationName(org_name);
      }

      const newOrganization = await this.organizationsRepository.createOrgs(
        userId,
        org_name.trim(),
        unique_name,
        logo_url || null,
        banner_url || null,
        description?.trim() || "Type description here...",
        settings?.default_timezone || "America/Sao_Paulo",
        settings?.default_locale || "en-US",
        settings?.country || null,
        settings || {}
      );

      await this._createDefaultOrganizationArea(newOrganization, userId);

      res.status(201).json({
        status: "OK",
        success: true,
        message: "Organization created successfully",
        data: newOrganization,
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      return next(fromUnknown(error));
    }
  }

  /**
   * Get organization data for the authenticated user.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with organization data or error
   */
  async getOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Organization not found",
          message: "User does not have an organization yet",
        });
      }

      const formattedOrganization = {
        created_at: organization.created_at,
        updated_at: organization.updated_at,
        identity: {
          id: organization.id,
          user_id: organization.user_id,
          org_name: organization.org_name,
          unique_name: organization.unique_name,
          logo_url: organization.logo_url,
          banner_url: organization.banner_url,
          description: organization.description,
          member_role: organization.member_role ?? null,
        },
        settings: organization.settings || {},
        owners: [
          {
            id: organization.user_id,
            name: organization.name,
            username: organization.username,
            email: organization.email,
            avatar_url: organization.avatar_url,
          },
        ],
        deleted: organization.deleted,
      };

      res
        .status(200)
        .json({ status: "OK", organization_data: formattedOrganization });
    } catch (error) {
      console.error("Error getting organization:", error);
      res
        .status(500)
        .json({ success: false, error: "Error getting organization" });
    }
  }

  /**
   * Update organization basic data and settings.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated organization data or error
   */
  async updateOrganization(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const {
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        settings,
      } = req.body;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      const P = this._orgPermissions;
      const body = req.body || {};
      const touchesBrand = [
        "org_name",
        "unique_name",
        "logo_url",
        "banner_url",
        "description",
        "settings",
      ].some((k) => Object.prototype.hasOwnProperty.call(body, k));

      if (
        touchesBrand &&
        !this._ensureOrgPermission(currentOrg, P.MANAGE_BRAND, res)
      )
        return;

      let updatedUniqueName = currentOrg.unique_name;

      if (org_name && org_name !== currentOrg.org_name) {
        updatedUniqueName = await generateUniqueOrganizationName(org_name);
      }

      if (unique_name && unique_name !== currentOrg.unique_name) {
        const normalizedName = normalizeOrganizationName(unique_name);
        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(
            normalizedName
          );

        if (existingNames.includes(normalizedName)) {
          throw new Error("Unique name is already in use");
        }
        updatedUniqueName = normalizedName;
      }

      const updatedSettings = settings
        ? { ...currentOrg.settings, ...settings }
        : currentOrg.settings;

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        org_name?.trim() || currentOrg.org_name,
        updatedUniqueName,
        logo_url !== undefined ? logo_url : currentOrg.logo_url,
        banner_url !== undefined ? banner_url : currentOrg.banner_url,
        description !== undefined
          ? description?.trim()
          : currentOrg.description,
        updatedSettings,
        currentOrg.deleted
      );

      if (!updatedOrg) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to update organization",
          code: "ORG_FORBIDDEN",
        });
      }

      res.status(200).json({
        status: "OK",
        success: true,
        message: "Organization updated successfully",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Error updating organization:", error);
      if (error instanceof Error && /not found/i.test(error.message)) {
        return next(
          AppError.notFound(
            "Organization not found",
            ERROR_CODES.RESOURCE_NOT_FOUND
          )
        );
      }
      return next(fromUnknown(error));
    }
  }

  /**
   * Update organization properties only.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated organization data or error
   */
  async updateOrganizationProperties(req, res) {
    try {
      return res.status(410).json({
        success: false,
        error:
          "Organization properties column has been removed. Use organization settings fields instead.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Error handling deprecated properties endpoint",
      });
    }
  }

  /**
   * Soft-delete the current user organization.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with deleted organization data or error
   */
  async deleteOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      if (
        !this._ensureOrgPermission(
          currentOrg,
          this._orgPermissions.MANAGE_ORG_LIFECYCLE,
          res
        )
      )
        return;

      const deletedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.settings,
        true
      );

      if (!deletedOrg) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to delete organization",
          code: "ORG_FORBIDDEN",
        });
      }

      res.status(200).json({
        status: "OK",
        success: true,
        message: "Organization deleted successfully",
        data: deletedOrg,
      });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res
        .status(500)
        .json({ success: false, error: "Error deleting organization" });
    }
  }

  /**
   * Restore a soft-deleted organization for the authenticated user.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with restored organization data or error
   */
  async restoreOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organizations =
        await this.organizationsRepository.getOrgsByUserId(userId);
      const organization = organizations.find((org) => org.deleted);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "No deleted organization found",
        });
      }

      const memberRole = await this.organizationsRepository.getMembershipRole(
        organization.id,
        userId
      );
      const orgWithRole = {
        ...organization,
        member_role: memberRole || ORG_ROLES.SUPER_ADMIN,
      };

      if (
        !this._ensureOrgPermission(
          orgWithRole,
          this._orgPermissions.MANAGE_ORG_LIFECYCLE,
          res
        )
      )
        return;

      const restoredOrg = await this.organizationsRepository.updateOrg(
        organization.id,
        userId,
        organization.org_name,
        organization.unique_name,
        organization.logo_url,
        organization.banner_url,
        organization.description,
        organization.settings,
        false
      );

      if (!restoredOrg) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to restore organization",
          code: "ORG_FORBIDDEN",
        });
      }

      res.status(200).json({
        status: "OK",
        success: true,
        message: "Organization restored successfully",
        data: restoredOrg,
      });
    } catch (error) {
      console.error("Error restoring organization:", error);
      res
        .status(500)
        .json({ success: false, error: "Error restoring organization" });
    }
  }

  /**
   * Upload and update organization logo.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with upload metadata or error
   */
  async uploadLogo(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file was uploaded" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      if (
        !this._ensureOrgPermission(
          currentOrg,
          this._orgPermissions.MANAGE_BRAND,
          res
        )
      )
        return;

      const result = await spacesService.uploadOrganizationLogo(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Error saving logo" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrgLogo(
        currentOrg.id,
        result.key,
        userId
      );

      if (!updatedOrg) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to update logo",
          code: "ORG_FORBIDDEN",
        });
      }

      res.status(200).json({
        status: "OK",
        success: true,
        message: "Logo updated successfully",
        data: {
          organization: orgDataResponse(updatedOrg),
          upload: {
            path: result.key,
            filename: result.fileName,
            size: result.size,
          },
        },
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ success: false, error: "Error uploading logo" });
    }
  }

  /**
   * Upload and update organization banner.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with upload metadata or error
   */
  async uploadBanner(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);

      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file was uploaded" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      if (
        !this._ensureOrgPermission(
          currentOrg,
          this._orgPermissions.MANAGE_BRAND,
          res
        )
      )
        return;

      const result = await spacesService.uploadOrganizationBanner(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Error saving banner" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrgBanner(
        currentOrg.id,
        result.key,
        userId
      );

      if (!updatedOrg) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions to update banner",
          code: "ORG_FORBIDDEN",
        });
      }

      res.status(200).json({
        status: "OK",
        success: true,
        message: "Banner updated successfully",
        data: {
          organization: orgDataResponse(updatedOrg),
          upload: {
            path: result.key,
            filename: result.fileName,
            size: result.size,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Error uploading banner" });
    }
  }

  /**
   * List projects for the current user organization.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with projects list or error
   */
  async organizationProjects(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      const projects =
        await this.organizationsRepository.getOrganizationProjects(
          currentOrg.id
        );

      res.status(200).json({
        status: "OK",
        organization_id: currentOrg.id,
        projects: projects,
      });
    } catch (error) {
      console.error("Error getting organization projects:", error);
      res.status(500).json({
        status: "ERROR",
        error: "Error getting organization projects",
      });
    }
  }
}

module.exports = new OrganizationsController();
