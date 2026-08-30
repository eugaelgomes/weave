const { executeQuery } = require("@/database/connection");

class WorkspaceRolesRepository {
  async listRoles(workspaceId) {
    const query = `
      SELECT * FROM workspaces_roles
      WHERE workspace_id = $1 AND deleted = false
      ORDER BY created_at ASC
    `;
    return await executeQuery(query, [workspaceId]);
  }

  async getRoleById(roleId, workspaceId) {
    const query = `
      SELECT * FROM workspaces_roles
      WHERE id = $1 AND workspace_id = $2 AND deleted = false
      LIMIT 1
    `;
    const results = await executeQuery(query, [roleId, workspaceId]);
    return results[0] || null;
  }

  async getRoleByName(name, workspaceId) {
    const query = `
      SELECT * FROM workspaces_roles
      WHERE name = $1 AND workspace_id = $2 AND deleted = false
      LIMIT 1
    `;
    const results = await executeQuery(query, [name, workspaceId]);
    return results[0] || null;
  }

  async createRole(
    { workspaceId, name, description, permissions, isSystem = false, createdBy = null },
    txClient = null
  ) {
    const query = `
      INSERT INTO workspaces_roles (
        workspace_id, name, description, permissions, is_system, created_by
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6)
      RETURNING *
    `;
    const params = [
      workspaceId,
      name,
      description || null,
      JSON.stringify(permissions || []),
      isSystem,
      createdBy,
    ];

    if (txClient) {
      const { rows } = await txClient.query(query, params);
      return rows[0];
    }
    const results = await executeQuery(query, params);
    return results[0];
  }

  async updateRole(roleId, workspaceId, { name, description, permissions }, _updatedBy = null) {
    const fields = [];
    const values = [roleId, workspaceId];
    let count = 3;

    if (name !== undefined) {
      fields.push(`name = $${count}`);
      values.push(name);
      count++;
    }
    if (description !== undefined) {
      fields.push(`description = $${count}`);
      values.push(description);
      count++;
    }
    if (permissions !== undefined) {
      fields.push(`permissions = $${count}::jsonb`);
      values.push(JSON.stringify(permissions));
      count++;
    }

    if (fields.length === 0) return this.getRoleById(roleId, workspaceId);

    const query = `
      UPDATE workspaces_roles
      SET ${fields.join(", ")}, updated_at = now()
      WHERE id = $1 AND workspace_id = $2 AND deleted = false
      RETURNING *
    `;
    const results = await executeQuery(query, values);
    return results[0] || null;
  }

  async deleteRole(roleId, workspaceId, deletedBy) {
    const query = `
      UPDATE workspaces_roles
      SET deleted = true, deleted_at = now(), deleted_by = $3
      WHERE id = $1 AND workspace_id = $2 AND is_system = false AND deleted = false
      RETURNING *
    `;
    const results = await executeQuery(query, [roleId, workspaceId, deletedBy]);
    return results[0] || null;
  }

  async setRolePermissions(roleId, workspaceId, permissions) {
    const query = `
      UPDATE workspaces_roles
      SET permissions = $3::jsonb, updated_at = now()
      WHERE id = $1 AND workspace_id = $2 AND deleted = false
      RETURNING *
    `;
    const results = await executeQuery(query, [roleId, workspaceId, JSON.stringify(permissions)]);
    return results[0] || null;
  }

  async getUserEffectivePermissions(workspaceId, userId) {
    const query = `
      SELECT r.permissions
      FROM workspace_members m
      JOIN workspaces_roles r ON r.id = m.role_id
      WHERE m.workspace_id = $1 
        AND m.user_id = $2 
        AND m.deleted = false
        AND r.deleted = false
      LIMIT 1
    `;
    const results = await executeQuery(query, [workspaceId, userId]);
    return results[0]?.permissions || [];
  }
}

module.exports = new WorkspaceRolesRepository();
