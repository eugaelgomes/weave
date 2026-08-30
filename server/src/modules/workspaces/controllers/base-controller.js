const { AppError, fromUnknown, ERROR_CODES } = require("@/errors");
const spacesService = require("@/services/storage.service");
const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const {
  normalizeOrganizationName,
  generateUniqueOrganizationName,
  orgDataResponse,
} = require("../utils/normalizer");
const { organizationResponseSchema } = require("../schemas/base.schema");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");
/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 *
 * @typedef {Object} AuthenticatedRequest
 * @property {Object} [user]
 * @property {string} user.userId
 *
 * @typedef {Object} OrganizationData
 * @property {string} org_name
 */

const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/workspaces/workspace-role-policy");

const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

class OrganizationsBaseController {
  constructor() {
    this.organizationsRepository = baseRepository;
    this.baseRepository = baseRepository;
  }

  /**
   * Validates user authentication.
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {string|null} Returns userId if authenticated, otherwise null.
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return null;
    }
    return userId;
  }

  /**
   * Gets the active workspace associated with the user (via membership + role `member_role`).
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Workspace data with injected `member_role` or null if not found
   */
  async _getUserOrganization(userId) {
    return this.baseRepository.getActiveOrganizationWithMembership(userId);
  }

  /**
   * @param {Object|null} workspace — result of `_getUserOrganization` (includes `member_role`)
   * @param {string} permission — `ORG_PERMISSIONS.*`
   * @param {Response} res
   * @returns {boolean} true if authorized
   */
  _ensureOrgPermission(workspace, permission, res) {
    if (!workspace) {
      res.status(404).json({
        error: "Workspace not found",
        success: false,
      });
      return false;
    }
    const role = workspace.member_role;
    if (!role || !orgRoleHasPermission(role, permission)) {
      res.status(403).json({
        code: "ORG_FORBIDDEN",
        error: "Insufficient workspace permissions",
        success: false,
      });
      return false;
    }
    return true;
  }

  /**
   * Ensures that the user has one of the listed permissions (e.g., brand + domains in the same PUT).
   * @param {Object|null} workspace
   * @param {string[]} permissions
   * @param {Response} res
   */
  _ensureOrgPermissionAny(workspace, permissions, res) {
    if (!workspace) {
      res.status(404).json({
        error: "Workspace not found",
        success: false,
      });
      return false;
    }
    const role = workspace.member_role;
    if (!role || !permissions.some((p) => orgRoleHasPermission(role, p))) {
      res.status(403).json({
        code: "ORG_FORBIDDEN",
        error: "Insufficient workspace permissions",
        success: false,
      });
      return false;
    }
    return true;
  }

  /** Exposes constants for controllers that need compound checks. */
  get _orgPermissions() {
    return ORG_PERMISSIONS;
  }

  /**
   * Role in `organization_members` (via getActiveOrganizationWithMembership).
   * @param {Object} workspace - Workspace object
   * @param {string} permissionKey - Key of the permission (e.g. MANAGE_MEMBERS)
   * @param {Response} [res] - Optional Express response object for automatic 403
   * @returns {boolean} True if permitted, false otherwise
   */
  _orgRoleHasPermission(workspace, permission) {
    const role = workspace?.member_role;
    if (!role || !permission) return false;
    return orgRoleHasPermission(role, permission);
  }

  /**
   * Validates the workspace's required fields.
   * @param {Partial<OrganizationData>} data
   * @throws {Error} Throws an error if validation fails.
   */
  _validateRequiredFields(data) {
    if (!data.org_name || typeof data.org_name !== "string") {
      throw new Error("Workspace name is required");
    }
    if (data.org_name.trim().length < 2) {
      throw new Error("Workspace name must be at least 2 characters long");
    }
    if (data.org_name.length > 100) {
      throw new Error("Workspace name must be at most 100 characters long");
    }
  }

  /**
   * Normalizes a domain format.
   * @param {string} domain
   * @returns {string|null} The normalized domain or null if the string is invalid.
   */
  _normalizeDomain(domain) {
    if (!domain || typeof domain !== "string") {
      return null;
    }

    const normalized = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*/, "");

    return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
  }

  /**
   * Validates a domain name.
   * @param {string} domain
   * @returns {string} The normalized and validated domain.
   * @throws {Error} Throws an error if the domain is invalid.
   */
  _validateDomainName(domain) {
    const normalized = this._normalizeDomain(domain);

    if (!normalized || !DOMAIN_REGEX.test(normalized)) {
      throw new Error("Invalid domain. Please use a valid domain such as example.com");
    }

    return normalized;
  }
}
module.exports = OrganizationsBaseController;

/**
 * Controller for workspace management.
 * Handles workspace lifecycle, branding assets, and workspace projects.
 */
class WorkspacesController extends OrganizationsBaseController {
  constructor() {
    super();
    this.teamsRepository = teamsRepository;
  }

  /**
   * Generate a unique team slug inside a workspace.
   * @param {string} workspaceId
   * @param {string} slugBase
   * @returns {Promise<string|null>}
   */
  async _generateUniqueTeamSlug(workspaceId, slugBase) {
    if (!slugBase) return null;
    const existingSlugs = await this.teamsRepository.getMatchingSlugs(workspaceId, slugBase);
    if (!existingSlugs.includes(slugBase)) return slugBase;
    let counter = 1;
    let candidate = `${slugBase}-${counter}`;
    while (existingSlugs.includes(candidate)) {
      counter += 1;
      candidate = `${slugBase}-${counter}`;
    }
    return candidate;
  }

  /**
   * Create the default "Central" team for a newly created workspace.
   * @param {Object} workspace
   * @param {string} createdBy
   * @returns {Promise<void>}
   */
  async _createDefaultTeam(workspace, createdBy) {
    const defaultName = "Team Central";
    const slugBase = workspace.unique_name || normalizeOrganizationName(defaultName);
    try {
      const uniqueSlug = await this._generateUniqueTeamSlug(workspace.id, slugBase);
      const newTeam = await this.teamsRepository.createArea({
        areaName: defaultName,
        createdBy,
        description: `Main team for workspace ${workspace.org_name}`,
        organizationId: workspace.id,
        parentAreaId: null,
        properties: { system: true },
        slug: uniqueSlug || `${slugBase}-${workspace.id}`,
      });
      await this.teamsRepository.addAreaMember(
        newTeam.id,
        workspace.id,
        createdBy,
        ORG_ROLES.ADMIN,
        createdBy
      );
    } catch (error) {
      console.error("Error creating default workspace team:", error);
      throw new Error("Failed to create the default central workspace team");
    }
  }

  // ─── Workspace Lifecycle ───────────────────────────────────────────────────

  async createOrganization(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const existingOrg = await this._getUserOrganization(userId);
      if (existingOrg) {
        return res.status(400).json({
          error: "User already has a workspace. Use PUT to update it.",
          success: false,
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
        if (!unique_name) throw new Error("Provided unique name is invalid after normalization");
        const existingNames = await this.organizationsRepository.getAvailableOrgNames(unique_name);
        if (existingNames.includes(unique_name))
          throw new Error(`Unique name '${unique_name}' is already in use`);
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

      await this._createDefaultTeam(newOrganization, userId);

      res.status(201).json({
        data: newOrganization,
        message: "Workspace created successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error creating workspace:", error);
      return next(fromUnknown(error));
    }
  }

  async getOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({
          error: "Workspace not found",
          message: "User does not have a workspace yet",
          success: false,
        });
      }

      const formatted = organizationResponseSchema.parse(workspace);

      res.status(200).json({ organization_data: formatted, status: "OK" });
    } catch (error) {
      console.error("Error getting workspace:", error);
      res.status(500).json({ error: "Error getting workspace", success: false });
    }
  }

  async updateOrganization(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { org_name, unique_name, logo_url, banner_url, description, settings } = req.body;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg)
        return res.status(404).json({ error: "Workspace not found", success: false });

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
        !this._ensureOrgPermission(currentOrg, this._orgPermissions.MANAGE_BRAND, res)
      )
        return;

      let updatedUniqueName = currentOrg.unique_name;

      if (org_name && org_name !== currentOrg.org_name) {
        updatedUniqueName = await generateUniqueOrganizationName(org_name);
      }

      if (unique_name && unique_name !== currentOrg.unique_name) {
        const normalizedName = normalizeOrganizationName(unique_name);
        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(normalizedName);
        if (existingNames.includes(normalizedName))
          throw new Error("Unique name is already in use");
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
        description !== undefined ? description?.trim() : currentOrg.description,
        updatedSettings,
        currentOrg.deleted
      );

      if (!updatedOrg) {
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient permissions to update workspace",
          success: false,
        });
      }

      res.status(200).json({
        data: updatedOrg,
        message: "Workspace updated successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error updating workspace:", error);
      if (error instanceof Error && /not found/i.test(error.message)) {
        return next(AppError.notFound("Workspace not found", ERROR_CODES.RESOURCE_NOT_FOUND));
      }
      return next(fromUnknown(error));
    }
  }

  async updateOrganizationProperties(req, res) {
    return res.status(410).json({
      error: "Workspace properties column has been removed. Use workspace settings fields instead.",
      success: false,
    });
  }

  async deleteOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg)
        return res.status(404).json({ error: "Workspace not found", success: false });

      if (!this._ensureOrgPermission(currentOrg, this._orgPermissions.MANAGE_ORG_LIFECYCLE, res))
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

      if (!deletedOrg)
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient permissions to delete workspace",
          success: false,
        });

      res.status(200).json({
        data: deletedOrg,
        message: "Workspace deleted successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      res.status(500).json({ error: "Error deleting workspace", success: false });
    }
  }

  async restoreOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspaces = await this.organizationsRepository.getOrgsByUserId(userId);
      const workspace = workspaces.find((org) => org.deleted);

      if (!workspace)
        return res.status(404).json({ error: "No deleted workspace found", success: false });

      const memberRole = await this.organizationsRepository.getMembershipRole(workspace.id, userId);
      const orgWithRole = { ...workspace, member_role: memberRole || ORG_ROLES.SUPER_ADMIN };

      if (!this._ensureOrgPermission(orgWithRole, this._orgPermissions.MANAGE_ORG_LIFECYCLE, res))
        return;

      const restoredOrg = await this.organizationsRepository.updateOrg(
        workspace.id,
        userId,
        workspace.org_name,
        workspace.unique_name,
        workspace.logo_url,
        workspace.banner_url,
        workspace.description,
        workspace.settings,
        false
      );

      if (!restoredOrg)
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient permissions to restore workspace",
          success: false,
        });

      res.status(200).json({
        data: restoredOrg,
        message: "Workspace restored successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error restoring workspace:", error);
      res.status(500).json({ error: "Error restoring workspace", success: false });
    }
  }

  // ─── Branding ─────────────────────────────────────────────────────────────

  async uploadLogo(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      if (!req.file) return res.status(400).json({ error: "No file was uploaded", success: false });

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg)
        return res.status(404).json({ error: "Workspace not found", success: false });
      if (!this._ensureOrgPermission(currentOrg, this._orgPermissions.MANAGE_BRAND, res)) return;

      const result = await spacesService.uploadOrganizationLogo(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );
      if (!result.success)
        return res.status(500).json({ error: "Error saving logo", success: false });

      const updatedOrg = await this.organizationsRepository.updateOrgLogo(
        currentOrg.id,
        result.key,
        userId
      );
      if (!updatedOrg)
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient permissions to update logo",
          success: false,
        });

      res.status(200).json({
        data: {
          upload: { filename: result.fileName, path: result.key, size: result.size },
          workspace: orgDataResponse(updatedOrg),
        },
        message: "Logo updated successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Error uploading logo", success: false });
    }
  }

  async uploadBanner(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      if (!req.file) return res.status(400).json({ error: "No file was uploaded", success: false });

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg)
        return res.status(404).json({ error: "Workspace not found", success: false });
      if (!this._ensureOrgPermission(currentOrg, this._orgPermissions.MANAGE_BRAND, res)) return;

      const result = await spacesService.uploadOrganizationBanner(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );
      if (!result.success)
        return res.status(500).json({ error: "Error saving banner", success: false });

      const updatedOrg = await this.organizationsRepository.updateOrgBanner(
        currentOrg.id,
        result.key,
        userId
      );
      if (!updatedOrg)
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient permissions to update banner",
          success: false,
        });

      res.status(200).json({
        data: {
          upload: { filename: result.fileName, path: result.key, size: result.size },
          workspace: orgDataResponse(updatedOrg),
        },
        message: "Banner updated successfully",
        status: "OK",
        success: true,
      });
    } catch {
      res.status(500).json({ error: "Error uploading banner", success: false });
    }
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  async organizationProjects(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg)
        return res.status(404).json({ error: "Workspace not found", success: false });

      const projects = await this.organizationsRepository.getOrganizationProjects(currentOrg.id);

      res.status(200).json({ organization_id: currentOrg.id, projects, status: "OK" });
    } catch (error) {
      console.error("Error getting workspace projects:", error);
      res.status(500).json({ error: "Error getting workspace projects", status: "ERROR" });
    }
  }
}

module.exports.workspacesController = new WorkspacesController();
