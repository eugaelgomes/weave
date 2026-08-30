const { AppError, fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");
const rolesRepository = require("@/modules/workspaces/repositories/roles.repository");
const { workspace_permissions_catalog } = require("@/modules/workspaces/permissions-catalog");
const { roleResponseSchema } = require("../schemas/roles.schema");
const { z } = require("zod");

class WorkspaceRolesController extends WorkspacesBaseController {
  constructor() {
    super();
    this.rolesRepository = rolesRepository;
  }

  async listRoles(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const roles = await this.rolesRepository.listRoles(workspace.id);
      res.status(200).json({ data: z.array(roleResponseSchema).parse(roles), success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async createRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      // TODO: require permission 'workspace:manage'
      const { name, description, permissions } = req.body;

      if (!name) {
        throw AppError.badRequest("Name is required");
      }

      const existingRole = await this.rolesRepository.getRoleByName(name, workspace.id);
      if (existingRole) {
        throw AppError.conflict("Role name already exists");
      }

      const newRole = await this.rolesRepository.createRole({
        createdBy: userId,
        description,
        isSystem: false,
        name,
        permissions: permissions || [],
        workspaceId: workspace.id,
      });

      res.status(201).json({
        data: roleResponseSchema.parse(newRole),
        message: "Role created successfully",
        success: true,
      });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      // TODO: require permission 'workspace:manage'
      const { roleId } = req.params;
      const { name, description, permissions } = req.body;

      const role = await this.rolesRepository.getRoleById(roleId, workspace.id);
      if (!role) {
        throw AppError.notFound("Role not found");
      }

      if (role.is_system && name !== undefined && name !== role.name) {
        throw AppError.badRequest("Cannot rename a system role");
      }

      const updatedRole = await this.rolesRepository.updateRole(
        roleId,
        workspace.id,
        { description, name, permissions },
        userId
      );

      res.status(200).json({
        data: roleResponseSchema.parse(updatedRole),
        message: "Role updated successfully",
        success: true,
      });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async deleteRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      // TODO: require permission 'workspace:manage'
      const { roleId } = req.params;

      const role = await this.rolesRepository.getRoleById(roleId, workspace.id);
      if (!role) {
        throw AppError.notFound("Role not found");
      }

      if (role.is_system) {
        throw AppError.badRequest("Cannot delete a system role");
      }

      await this.rolesRepository.deleteRole(roleId, workspace.id, userId);

      res.status(200).json({ message: "Role deleted successfully", success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getPermissionsCatalog(req, res, next) {
    try {
      res.status(200).json({ data: workspace_permissions_catalog, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceRolesController();
