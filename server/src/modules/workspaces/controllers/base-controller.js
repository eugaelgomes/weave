const { AppError, fromUnknown, ERROR_CODES } = require("@/errors");
const spacesService = require("@/services/storage.service");
const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const {
  normalizeWorkspaceName,
  generateUniqueWorkspaceName,
  workspaceDataResponse,
} = require("../utils/normalizer");
const { workspaceResponseSchema } = require("../schemas/base.schema");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");
/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 *
 * @typedef {Object} AuthenticatedRequest
 * @property {Object} [user]
 * @property {string} user.userId
 *
 * @typedef {Object} WorkspaceData
 * @property {string} workspace_name
 */

const {
  workspaceRoleHasPermission,
  WORKSPACE_PERMISSIONS,
} = require("@/modules/workspaces/workspace-role-policy");

const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

class WorkspacesBaseController {
  constructor() {
    this.workspacesRepository = baseRepository;
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
  async _getUserWorkspace(userId) {
    return this.baseRepository.getActiveWorkspaceWithMembership(userId);
  }

  /**
   * @param {Object|null} workspace — result of `_getUserWorkspace` (includes `member_role`)
   * @param {string} permission — `WORKSPACE_PERMISSIONS.*`
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
    if (!role || !workspaceRoleHasPermission(role, permission)) {
      res.status(403).json({
        code: "WORKSPACE_FORBIDDEN",
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
    if (!role || !permissions.some((p) => workspaceRoleHasPermission(role, p))) {
      res.status(403).json({
        code: "WORKSPACE_FORBIDDEN",
        error: "Insufficient workspace permissions",
        success: false,
      });
      return false;
    }
    return true;
  }

  /** Exposes constants for controllers that need compound checks. */
  get _workspacePermissions() {
    return WORKSPACE_PERMISSIONS;
  }

  /**
   * Role in `workspace_members` (via getActiveWorkspaceWithMembership).
   * @param {Object} workspace - Workspace object
   * @param {string} permissionKey - Key of the permission (e.g. MANAGE_MEMBERS)
   * @param {Response} [res] - Optional Express response object for automatic 403
   * @returns {boolean} True if permitted, false otherwise
   */
  _workspaceRoleHasPermission(workspace, permission) {
    const role = workspace?.member_role;
    if (!role || !permission) return false;
    return workspaceRoleHasPermission(role, permission);
  }

  /**
   * Validates the workspace's required fields.
   * @param {Partial<WorkspaceData>} data
   * @throws {Error} Throws an error if validation fails.
   */
  _validateRequiredFields(data) {
    if (!data.workspace_name || typeof data.workspace_name !== "string") {
      throw new Error("Workspace name is required");
    }
    if (data.workspace_name.trim().length < 2) {
      throw new Error("Workspace name must be at least 2 characters long");
    }
    if (data.workspace_name.length > 100) {
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
module.exports = WorkspacesBaseController;

/**
 * Controller for workspace management.
 * Handles workspace lifecycle, branding assets, and workspace projects.
 */
class WorkspacesController extends WorkspacesBaseController {
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
    const slugBase = workspace.unique_name || normalizeWorkspaceName(defaultName);
    try {
      const uniqueSlug = await this._generateUniqueTeamSlug(workspace.id, slugBase);
      const newTeam = await this.teamsRepository.createArea({
        areaName: defaultName,
        createdBy,
        description: `Main team for workspace ${workspace.workspace_name}`,
        parentAreaId: null,
        properties: { system: true },
        slug: uniqueSlug || `${slugBase}-${workspace.id}`,
        workspaceId: workspace.id,
      });
      await this.teamsRepository.addAreaMember(
        newTeam.id,
        workspace.id,
        createdBy,
        "admin",
        createdBy
      );
    } catch (error) {
      console.error("Error creating default workspace team:", error);
      throw new Error("Failed to create the default central workspace team");
    }
  }

  // ─── Workspace Lifecycle ───────────────────────────────────────────────────

  async createWorkspace(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const existingWorkspace = await this._getUserWorkspace(userId);
      if (existingWorkspace) {
        return res.status(400).json({
          error: "User already has a workspace. Use PUT to update it.",
          success: false,
        });
      }

      const {
        workspace_name,
        unique_name: providedUniqueName,
        logo_url,
        banner_url,
        description,
        settings,
      } = req.body;

      let unique_name;
      if (providedUniqueName) {
        unique_name = normalizeWorkspaceName(providedUniqueName);
        if (!unique_name) throw new Error("Provided unique name is invalid after normalization");
        const existingNames = await this.workspacesRepository.getAvailableOrgNames(unique_name);
        if (existingNames.includes(unique_name))
          throw new Error(`Unique name '${unique_name}' is already in use`);
      } else {
        unique_name = await generateUniqueWorkspaceName(workspace_name);
      }

      const newWorkspace = await this.workspacesRepository.createWorkspaces(
        userId,
        workspace_name.trim(),
        unique_name,
        logo_url || null,
        banner_url || null,
        description?.trim() || "Type description here...",
        settings?.default_timezone || "America/Sao_Paulo",
        settings?.default_locale || "en-US",
        settings?.country || null,
        settings || {}
      );

      await this._createDefaultTeam(newWorkspace, userId);

      res.status(201).json({
        data: newWorkspace,
        message: "Workspace created successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error creating workspace:", error);
      return next(fromUnknown(error));
    }
  }

  async getWorkspace(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({
          error: "Workspace not found",
          message: "User does not have a workspace yet",
          success: false,
        });
      }

      const formatted = workspaceResponseSchema.parse(workspace);

      res.status(200).json({ status: "OK", workspace_data: formatted });
    } catch (error) {
      console.error("Error getting workspace:", error);
      res.status(500).json({ error: "Error getting workspace", success: false });
    }
  }

  async updateWorkspace(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { workspace_name, unique_name, logo_url, banner_url, description, settings } = req.body;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace)
        return res.status(404).json({ error: "Workspace not found", success: false });

      const body = req.body || {};
      const touchesBrand = [
        "workspace_name",
        "unique_name",
        "logo_url",
        "banner_url",
        "description",
        "settings",
      ].some((k) => Object.prototype.hasOwnProperty.call(body, k));

      if (
        touchesBrand &&
        !this._ensureOrgPermission(currentWorkspace, this._workspacePermissions.MANAGE_BRAND, res)
      )
        return;

      let updatedUniqueName = currentWorkspace.unique_name;

      if (workspace_name && workspace_name !== currentWorkspace.workspace_name) {
        updatedUniqueName = await generateUniqueWorkspaceName(workspace_name);
      }

      if (unique_name && unique_name !== currentWorkspace.unique_name) {
        const normalizedName = normalizeWorkspaceName(unique_name);
        const existingNames = await this.workspacesRepository.getAvailableOrgNames(normalizedName);
        if (existingNames.includes(normalizedName))
          throw new Error("Unique name is already in use");
        updatedUniqueName = normalizedName;
      }

      const updatedSettings = settings
        ? { ...currentWorkspace.settings, ...settings }
        : currentWorkspace.settings;

      const updatedWorkspace = await this.workspacesRepository.updateWorkspace(
        currentWorkspace.id,
        userId,
        workspace_name?.trim() || currentWorkspace.workspace_name,
        updatedUniqueName,
        logo_url !== undefined ? logo_url : currentWorkspace.logo_url,
        banner_url !== undefined ? banner_url : currentWorkspace.banner_url,
        description !== undefined ? description?.trim() : currentWorkspace.description,
        updatedSettings,
        currentWorkspace.deleted
      );

      if (!updatedWorkspace) {
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient permissions to update workspace",
          success: false,
        });
      }

      res.status(200).json({
        data: updatedWorkspace,
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

  async updateWorkspaceProperties(req, res) {
    return res.status(410).json({
      error: "Workspace properties column has been removed. Use workspace settings fields instead.",
      success: false,
    });
  }

  async deleteWorkspace(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace)
        return res.status(404).json({ error: "Workspace not found", success: false });

      if (
        !this._ensureOrgPermission(
          currentWorkspace,
          this._workspacePermissions.MANAGE_ORG_LIFECYCLE,
          res
        )
      )
        return;

      const deletedWorkspace = await this.workspacesRepository.updateWorkspace(
        currentWorkspace.id,
        userId,
        currentWorkspace.workspace_name,
        currentWorkspace.unique_name,
        currentWorkspace.logo_url,
        currentWorkspace.banner_url,
        currentWorkspace.description,
        currentWorkspace.settings,
        true
      );

      if (!deletedWorkspace)
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient permissions to delete workspace",
          success: false,
        });

      res.status(200).json({
        data: deletedWorkspace,
        message: "Workspace deleted successfully",
        status: "OK",
        success: true,
      });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      res.status(500).json({ error: "Error deleting workspace", success: false });
    }
  }

  async restoreWorkspace(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspaces = await this.workspacesRepository.getWorkspacesByUserId(userId);
      const workspace = workspaces.find((workspace) => workspace.deleted);

      if (!workspace)
        return res.status(404).json({ error: "No deleted workspace found", success: false });

      const memberRole = await this.workspacesRepository.getMembershipRole(workspace.id, userId);
      const workspaceWithRole = {
        ...workspace,
        member_role: memberRole || WORKSPACE_ROLES.SUPER_ADMIN,
      };

      if (
        !this._ensureOrgPermission(
          workspaceWithRole,
          this._workspacePermissions.MANAGE_ORG_LIFECYCLE,
          res
        )
      )
        return;

      const restoredWorkspace = await this.workspacesRepository.updateWorkspace(
        workspace.id,
        userId,
        workspace.workspace_name,
        workspace.unique_name,
        workspace.logo_url,
        workspace.banner_url,
        workspace.description,
        workspace.settings,
        false
      );

      if (!restoredWorkspace)
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient permissions to restore workspace",
          success: false,
        });

      res.status(200).json({
        data: restoredWorkspace,
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

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace)
        return res.status(404).json({ error: "Workspace not found", success: false });
      if (
        !this._ensureOrgPermission(currentWorkspace, this._workspacePermissions.MANAGE_BRAND, res)
      )
        return;

      const result = await spacesService.uploadWorkspaceLogo(
        req.file.buffer,
        req.file.mimetype,
        currentWorkspace.id
      );
      if (!result.success)
        return res.status(500).json({ error: "Error saving logo", success: false });

      const updatedWorkspace = await this.workspacesRepository.updateWorkspaceLogo(
        currentWorkspace.id,
        result.key,
        userId
      );
      if (!updatedWorkspace)
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient permissions to update logo",
          success: false,
        });

      res.status(200).json({
        data: {
          upload: { filename: result.fileName, path: result.key, size: result.size },
          workspace: workspaceDataResponse(updatedWorkspace),
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

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace)
        return res.status(404).json({ error: "Workspace not found", success: false });
      if (
        !this._ensureOrgPermission(currentWorkspace, this._workspacePermissions.MANAGE_BRAND, res)
      )
        return;

      const result = await spacesService.uploadWorkspaceBanner(
        req.file.buffer,
        req.file.mimetype,
        currentWorkspace.id
      );
      if (!result.success)
        return res.status(500).json({ error: "Error saving banner", success: false });

      const updatedWorkspace = await this.workspacesRepository.updateWorkspaceBanner(
        currentWorkspace.id,
        result.key,
        userId
      );
      if (!updatedWorkspace)
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient permissions to update banner",
          success: false,
        });

      res.status(200).json({
        data: {
          upload: { filename: result.fileName, path: result.key, size: result.size },
          workspace: workspaceDataResponse(updatedWorkspace),
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

  async workspaceProjects(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace)
        return res.status(404).json({ error: "Workspace not found", success: false });

      const projects = await this.workspacesRepository.getWorkspaceProjects(currentWorkspace.id);

      res.status(200).json({ projects, status: "OK", workspace_id: currentWorkspace.id });
    } catch (error) {
      console.error("Error getting workspace projects:", error);
      res.status(500).json({ error: "Error getting workspace projects", status: "ERROR" });
    }
  }
}

module.exports.workspacesController = new WorkspacesController();
