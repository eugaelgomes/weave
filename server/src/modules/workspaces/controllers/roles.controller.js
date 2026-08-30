const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const rolesRepository = require("@/modules/workspaces/repositories/roles.repository");
const { workspace_permissions_catalog } = require("@/modules/workspaces/permissions-catalog");

class WorkspaceRolesController extends OrganizationsBaseController {
  constructor() {
    super();
    this.rolesRepository = rolesRepository;
  }

  async listRoles(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const roles = await this.rolesRepository.listRoles(workspace.id);
      res.status(200).json({ data: roles, status: "OK" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async createRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      // TODO: require permission 'workspace:manage'
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required", success: false });
      }

      const existingRole = await this.rolesRepository.getRoleByName(name, workspace.id);
      if (existingRole) {
        return res.status(400).json({ error: "Role name already exists", success: false });
      }

      const newRole = await this.rolesRepository.createRole({
        workspaceId: workspace.id,
        name,
        description,
        permissions: permissions || [],
        createdBy: userId,
        isSystem: false,
      });

      res.status(201).json({ data: newRole, status: "OK", message: "Role created successfully" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      // TODO: require permission 'workspace:manage'
      const { roleId } = req.params;
      const { name, description, permissions } = req.body;

      const role = await this.rolesRepository.getRoleById(roleId, workspace.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found", success: false });
      }

      if (role.is_system && name !== undefined && name !== role.name) {
        return res.status(400).json({ error: "Cannot rename a system role", success: false });
      }

      const updatedRole = await this.rolesRepository.updateRole(
        roleId,
        workspace.id,
        { name, description, permissions },
        userId
      );

      res.status(200).json({ data: updatedRole, status: "OK", message: "Role updated successfully" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async deleteRole(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      // TODO: require permission 'workspace:manage'
      const { roleId } = req.params;

      const role = await this.rolesRepository.getRoleById(roleId, workspace.id);
      if (!role) {
        return res.status(404).json({ error: "Role not found", success: false });
      }

      if (role.is_system) {
        return res.status(400).json({ error: "Cannot delete a system role", success: false });
      }

      await this.rolesRepository.deleteRole(roleId, workspace.id, userId);

      res.status(200).json({ status: "OK", message: "Role deleted successfully" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getPermissionsCatalog(req, res, next) {
    try {
      res.status(200).json({ data: workspace_permissions_catalog, status: "OK" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceRolesController();
