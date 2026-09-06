/**
 * @typedef {Object} WorkspaceRole
 * @property {string} id
 * @property {string} workspace_id
 * @property {string} name
 * @property {string|null} description
 * @property {any} permissions
 * @property {boolean} is_system
 * @property {boolean} deleted
 * @property {string|null} created_by
 * @property {string|null} updated_by
 * @property {string|null} deleted_by
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {Date|null} deleted_at
 */

const { prisma } = require("@theweave/database");

class WorkspaceRolesRepository {
  /**
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole[]>}
   */
  async listRoles(workspaceId, client = prisma) {
    return await client.workspaces_roles.findMany({
      orderBy: {
        created_at: "asc",
      },
      where: {
        deleted: false,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} roleId
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole|null>}
   */
  async getRoleById(roleId, workspaceId, client = prisma) {
    return await client.workspaces_roles.findFirst({
      where: {
        deleted: false,
        id: roleId,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} name
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole|null>}
   */
  async getRoleByName(name, workspaceId, client = prisma) {
    return await client.workspaces_roles.findFirst({
      where: {
        deleted: false,
        name,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {Object} data
   * @param {string} data.workspaceId
   * @param {string} data.name
   * @param {string} [data.description]
   * @param {any[]} [data.permissions]
   * @param {boolean} [data.isSystem=false]
   * @param {string} [data.createdBy]
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole>}
   */
  async createRole(
    { workspaceId, name, description, permissions, isSystem = false, createdBy = null },
    client = prisma
  ) {
    return await client.workspaces_roles.create({
      data: {
        created_by: createdBy,
        description: description || null,
        is_system: isSystem,
        name,
        permissions: permissions || [],
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} roleId
   * @param {string} workspaceId
   * @param {Object} data
   * @param {string} [data.name]
   * @param {string} [data.description]
   * @param {any[]} [data.permissions]
   * @param {string} [_updatedBy]
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole|null>}
   */
  async updateRole(
    roleId,
    workspaceId,
    { name, description, permissions },
    _updatedBy = null,
    client = prisma
  ) {
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (permissions !== undefined) data.permissions = permissions;

    if (Object.keys(data).length === 0) return this.getRoleById(roleId, workspaceId, client);

    const result = await client.workspaces_roles.updateMany({
      data: {
        ...data,
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        id: roleId,
        workspace_id: workspaceId,
      },
    });

    if (result.count === 0) return null;
    return this.getRoleById(roleId, workspaceId, client);
  }

  /**
   * @param {string} roleId
   * @param {string} workspaceId
   * @param {string} deletedBy
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole|null>}
   */
  async deleteRole(roleId, workspaceId, deletedBy, client = prisma) {
    const result = await client.workspaces_roles.updateMany({
      data: {
        deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
      where: {
        deleted: false,
        id: roleId,
        is_system: false,
        workspace_id: workspaceId,
      },
    });

    if (result.count === 0) return null;
    return await client.workspaces_roles.findFirst({
      where: { id: roleId },
    });
  }

  /**
   * @param {string} roleId
   * @param {string} workspaceId
   * @param {any[]} permissions
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<WorkspaceRole|null>}
   */
  async setRolePermissions(roleId, workspaceId, permissions, client = prisma) {
    const result = await client.workspaces_roles.updateMany({
      data: {
        permissions,
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        id: roleId,
        workspace_id: workspaceId,
      },
    });

    if (result.count === 0) return null;
    return this.getRoleById(roleId, workspaceId, client);
  }

  /**
   * @param {string} workspaceId
   * @param {string} userId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<string[]>}
   */
  async getUserEffectivePermissions(workspaceId, userId, client = prisma) {
    const query = `
      SELECT DISTINCT perm
      FROM workspace_members om
      JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      JOIN workspaces_roles r ON r.id = wmr.role_id
      CROSS JOIN jsonb_array_elements_text(r.permissions) as perm
      WHERE om.workspace_id = $1
        AND om.user_id = $2
        AND om.deleted = false
        AND r.deleted = false
    `;
    const results = await client.$queryRawUnsafe(query, workspaceId, userId);
    return results.map((row) => row.perm);
  }
}

module.exports = new WorkspaceRolesRepository();
