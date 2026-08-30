const { executeQuery } = require("@/database/connection");

class TeamsRepository {
  async listWorkspaceTeams(workspaceId) {
    const query = `
      SELECT * FROM teams
      WHERE workspace_id = $1 AND deleted = false
      ORDER BY name ASC;
    `;
    return await executeQuery(query, [workspaceId]);
  }

  async getRootTeams(workspaceId) {
    const query = `
      SELECT * FROM teams
      WHERE workspace_id = $1 AND parent_team_id IS NULL AND deleted = false
      ORDER BY name ASC;
    `;
    return await executeQuery(query, [workspaceId]);
  }

  async getTeamById(teamId, workspaceId) {
    const query = `
      SELECT * FROM teams
      WHERE id = $1 AND workspace_id = $2 AND deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [teamId, workspaceId]);
    return rows[0] || null;
  }

  async getTeamBySlug(workspaceId, slug) {
    const query = `
      SELECT * FROM teams
      WHERE slug = $1 AND workspace_id = $2 AND deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [slug, workspaceId]);
    return rows[0] || null;
  }

  async getMatchingSlugs(workspaceId, slugBase) {
    const query = `
      SELECT slug FROM teams
      WHERE slug LIKE $1 || '%' AND workspace_id = $2 AND deleted = false;
    `;
    const rows = await executeQuery(query, [slugBase, workspaceId]);
    return rows.map((row) => row.slug);
  }

  async createTeam({
    workspaceId,
    parentTeamId,
    name,
    slug,
    description,
    properties,
    color,
    icon,
    visibility,
    createdBy,
  }) {
    const query = `
      INSERT INTO teams (
        workspace_id, parent_team_id, name, slug, description, properties,
        color, icon, visibility, created_by, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb,
        $7, $8::jsonb, $9::public.visibility_enum, $10, NOW()
      )
      RETURNING *;
    `;
    const values = [
      workspaceId,
      parentTeamId || null,
      name,
      slug,
      description || null,
      JSON.stringify(properties || {}),
      color || null,
      JSON.stringify(icon || {}),
      visibility || "PRIVATE",
      createdBy || null,
    ];

    const rows = await executeQuery(query, values);
    return rows[0];
  }

  async updateTeam(teamId, workspaceId, fields = {}, updatedBy) {
    const allowedFields = [
      "name",
      "slug",
      "description",
      "properties",
      "active",
      "parent_team_id",
      "color",
      "icon",
      "visibility",
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${paramIndex}`);

        let value = fields[key];
        if (key === "properties" || key === "icon") {
          value = JSON.stringify(value);
        }

        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return this.getTeamById(teamId, workspaceId);
    }

    if (updatedBy) {
      updates.push(`updated_by = $${paramIndex}`);
      values.push(updatedBy);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    values.push(teamId, workspaceId);

    const query = `
      UPDATE teams
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND deleted = false
      RETURNING *;
    `;

    const rows = await executeQuery(query, values);
    return rows[0] || null;
  }

  async softDeleteTeam(teamId, workspaceId, deletedBy) {
    const query = `
      UPDATE teams
      SET active = false, deleted = true, deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = $2 AND workspace_id = $3 AND deleted = false
      RETURNING *;
    `;
    const rows = await executeQuery(query, [deletedBy, teamId, workspaceId]);
    return rows[0] || null;
  }

  async listTeamMembers(teamId, workspaceId) {
    const query = `
      SELECT 
        tm.*,
        u.avatar_url,
        u.email,
        u.name,
        u.username,
        wr.id as "workspace_roles.id",
        wr.name as "workspace_roles.name",
        wr.description as "workspace_roles.description",
        wr.permissions as "workspace_roles.permissions"
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN users u ON u.user_id = tm.user_id
      LEFT JOIN workspaces_roles wr ON wr.id = tm.role_id
      WHERE tm.team_id = $1 AND t.workspace_id = $2 AND tm.deleted = false
      ORDER BY u.name ASC;
    `;
    const rows = await executeQuery(query, [teamId, workspaceId]);

    return rows.map((row) => {
      return {
        ...row,
        users_team_members_user_idTousers: {
          avatar_url: row.avatar_url,
          email: row.email,
          name: row.name,
          username: row.username,
        },
        workspace_roles: row["workspace_roles.id"]
          ? {
              description: row["workspace_roles.description"],
              id: row["workspace_roles.id"],
              name: row["workspace_roles.name"],
              permissions: row["workspace_roles.permissions"],
            }
          : null,
      };
    });
  }

  async getTeamMember(teamId, workspaceId, userId) {
    const query = `
      SELECT 
        tm.*,
        wr.id as "workspace_roles.id",
        wr.name as "workspace_roles.name",
        wr.description as "workspace_roles.description",
        wr.permissions as "workspace_roles.permissions"
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      LEFT JOIN workspaces_roles wr ON wr.id = tm.role_id
      WHERE tm.team_id = $1 AND t.workspace_id = $2 AND tm.user_id = $3 AND tm.deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [teamId, workspaceId, userId]);
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      ...row,
      workspace_roles: row["workspace_roles.id"]
        ? {
            description: row["workspace_roles.description"],
            id: row["workspace_roles.id"],
            name: row["workspace_roles.name"],
            permissions: row["workspace_roles.permissions"],
          }
        : null,
    };
  }

  async addTeamMember(teamId, workspaceId, userId, roleId, addedBy) {
    const team = await this.getTeamById(teamId, workspaceId);
    if (!team) return null;

    const query = `
      INSERT INTO team_members (
        team_id, user_id, role_id, added_by, updated_at
      )
      VALUES (
        $1, $2, $3, $4, NOW()
      )
      ON CONFLICT (team_id, user_id) 
      DO UPDATE SET 
        role_id = EXCLUDED.role_id,
        added_by = EXCLUDED.added_by,
        deleted = false,
        deleted_at = null,
        suspended = false,
        updated_at = NOW()
      RETURNING *;
    `;

    const rows = await executeQuery(query, [teamId, userId, roleId, addedBy]);
    return rows[0];
  }

  async updateTeamMemberRole(teamId, workspaceId, userId, roleId) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    const query = `
      UPDATE team_members
      SET role_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const rows = await executeQuery(query, [roleId, existing.id]);
    return rows[0] || null;
  }

  async removeTeamMember(teamId, workspaceId, userId, _removedBy) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    const query = `
      UPDATE team_members
      SET deleted = true, deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const rows = await executeQuery(query, [existing.id]);
    return rows[0] || null;
  }
}

module.exports = new TeamsRepository();
