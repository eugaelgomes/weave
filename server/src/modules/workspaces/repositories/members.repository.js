const { executeQuery, getConnection } = require("@/database/connection");
const { generatePublicId } = require("@/utils/formatters.util");

class WorkspaceMembersRepository {
  async getMembershipRole(workspace_id, user_id) {
    const query = `
      SELECT r.name as role 
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = $2
        AND om.deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [workspace_id, user_id]);
    return rows[0]?.role ?? null;
  }

  async getMembershipsByUserIds(userIds, workspaceId) {
    if (!userIds || userIds.length === 0) return [];

    const query = `
      SELECT om.user_id::text, r.name as role, om.status
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = ANY($2::uuid[])
        AND om.deleted = false
    `;
    return await executeQuery(query, [workspaceId, userIds]);
  }

  async getWorkspaceMembers(workspace_id) {
    const query = `
      SELECT 
        om.*,
        r.name as role,
        u1.name,
        u1.username,
        u1.email,
        u1.avatar_url,
        u2.name as inviter_name,
        u2.username as inviter_username,
        u2.avatar_url as inviter_avatar_url,
        (SELECT COUNT(*) 
         FROM notes n 
         WHERE n.user_id = u1.user_id AND n.deleted = false) as notes_count,
        (SELECT COALESCE(json_agg(json_build_object(
           'project_id', p.id::text,
           'project_name', p.title,
           'role', pm.role
         )), '[]'::json)
         FROM project_members pm
         JOIN projects p ON p.id = pm.project_id
         WHERE pm.user_id = u1.user_id
           AND pm.deleted = false 
           AND p.deleted = false) as projects,
        (SELECT COALESCE(json_agg(json_build_object(
           'team_id', a.id::text,
           'team_name', a.name,
           'role', am.role_id
         )), '[]'::json)
         FROM team_members am
         JOIN teams a ON a.id = am.team_id
         WHERE am.user_id = u1.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND a.workspace_id = $1) as teams,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = u1.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      LEFT JOIN users u1 ON om.user_id = u1.user_id
      LEFT JOIN users u2 ON om.invited_by = u2.user_id
      WHERE om.workspace_id = $1
        AND om.deleted = false
      ORDER BY 
        CASE r.name 
          WHEN 'SUPER_ADMIN' THEN 1
          WHEN 'ADMIN' THEN 2
          WHEN 'MEMBER' THEN 3
          WHEN 'GUEST' THEN 4
          ELSE 5
        END,
        om.created_at ASC;
    `;
    const results = await executeQuery(query, [workspace_id]);
    return results;
  }

  async countActiveMembersByRole(workspace_id, role) {
    const query = `
      SELECT COUNT(*)::int AS total
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      WHERE om.workspace_id = $1
        AND r.name = UPPER($2)
        AND om.deleted = false;
    `;
    const results = await executeQuery(query, [workspace_id, role]);
    return results[0]?.total || 0;
  }

  async addWorkspaceMember(workspace_id, user_id, role_id, status, invited_by, txClient = null) {
    const inviterId = invited_by || user_id;
    const query = `
      WITH existing AS (
        SELECT id, deleted
        FROM workspace_members
        WHERE workspace_id = $1
          AND user_id = $2
        LIMIT 1
      ),
      reactivated AS (
        UPDATE workspace_members
        SET deleted = false,
            role_id = $3,
            status = UPPER($4)::public.workspace_member_status_enum,
            invited_by = $5,
            updated_at = now(),
            removed_at = NULL,
            removed_by = NULL
        WHERE id = (SELECT id FROM existing WHERE deleted = true)
        RETURNING *
      ),
      inserted AS (
        INSERT INTO workspace_members (workspace_id, user_id, role_id, status, invited_by)
        SELECT $1, $2, $3, UPPER($4)::public.workspace_member_status_enum, $5
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING *
      )
      SELECT * FROM reactivated
      UNION ALL
      SELECT * FROM inserted;
    `;
    const params = [workspace_id, user_id, role_id, status, inviterId];

    if (txClient) {
      const { rows } = await txClient.query(query, params);
      return rows[0];
    }

    const results = await executeQuery(query, params);
    return results[0];
  }

  async getAutoAssignableProjectMembers(workspaceId, excludeUserId) {
    const query = `
      SELECT DISTINCT ON (user_id) user_id::text, project_role
      FROM (
        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 1 AS priority
        FROM workspace_members om
        JOIN workspaces_roles r ON r.id = om.role_id
        WHERE om.workspace_id = $1
          AND r.name IN ('ADMIN', 'SUPER_ADMIN')
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT am.user_id, 'CONTRIBUTOR' AS project_role, 2 AS priority
        FROM team_members am
        JOIN teams a ON a.id = am.team_id
        WHERE a.workspace_id = $1
          AND am.deleted = false
          AND am.user_id != $2::uuid
      ) sub
      ORDER BY user_id, priority ASC;
    `;

    return executeQuery(query, [workspaceId, excludeUserId]);
  }

  async removeWorkspaceMember(workspace_id, user_id) {
    const query = `
      WITH deleted_workspace_member AS (
        UPDATE workspace_members om
        SET deleted = true, updated_at = now()
        FROM workspaces_roles r
        WHERE om.role_id = r.id 
          AND om.workspace_id = $1 
          AND om.user_id = $2 
          AND r.name NOT IN ('ADMIN', 'SUPER_ADMIN')
        RETURNING om.*
      ),
      deleted_team_members AS (
        UPDATE team_members am
        SET deleted = true, updated_at = now()
        FROM teams a
        WHERE a.id = am.team_id
          AND a.workspace_id = $1 
          AND am.user_id = $2
          AND EXISTS (SELECT 1 FROM deleted_workspace_member)
        RETURNING am.*
      )
      SELECT * FROM deleted_workspace_member;
    `;
    const results = await executeQuery(query, [workspace_id, user_id]);
    return results[0];
  }

  async updateMemberRole(workspace_id, user_id, role_name_or_id) {
    // Determine if we were given a name (like 'ADMIN') or an id (UUID)
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        role_name_or_id
      );

    let query;
    if (isUUID) {
      query = `
        UPDATE workspace_members
        SET role_id = $3, updated_at = now()
        WHERE workspace_id = $1 AND user_id = $2 
        RETURNING *;
      `;
    } else {
      query = `
        UPDATE workspace_members
        SET role_id = (SELECT id FROM workspaces_roles WHERE workspace_id = $1 AND name = UPPER($3) LIMIT 1),
            updated_at = now()
        WHERE workspace_id = $1 AND user_id = $2 
        RETURNING *;
      `;
    }
    const results = await executeQuery(query, [workspace_id, user_id, role_name_or_id]);
    return results[0];
  }

  async updateMemberStatus(workspace_id, user_id, status) {
    const query = `
      UPDATE workspace_members
      SET status = UPPER($3)::public.workspace_member_status_enum,
          updated_at = now()
      WHERE workspace_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [workspace_id, user_id, status]);
    return results[0];
  }

  async getWorkspaceMember(workspace_id, user_id) {
    const query = `
      SELECT om.*, r.name as role 
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = $2
        AND om.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [workspace_id, user_id]);
    return results[0];
  }

  async isMember(workspace_id, user_id) {
    const query = `
      SELECT 1 FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = $2
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [workspace_id, user_id]);
    return results.length > 0;
  }

  async getWorkspaceOwner(workspace_id) {
    const query = `
      SELECT om.*, r.name as role, u.name, u.username, u.email, u.avatar_url
      FROM workspace_members om
      JOIN workspaces_roles r ON r.id = om.role_id
      LEFT JOIN users u ON om.user_id = u.user_id
      INNER JOIN workspaces o ON o.id = om.workspace_id
      WHERE om.workspace_id = $1 AND om.user_id = o.user_id
        AND om.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [workspace_id]);
    return results[0] || null;
  }

  async createWorkspaceInvite(
    workspace_id,
    email,
    role,
    invited_by,
    name = null,
    username = null,
    _target_teams = []
  ) {
    const client = await getConnection();
    try {
      await client.query("BEGIN");

      const findRoleQuery =
        "SELECT id FROM workspaces_roles WHERE workspace_id = $1 AND name = $2 LIMIT 1";
      const roleRow = await client.query(findRoleQuery, [workspace_id, role]);

      if (roleRow.rows.length === 0) {
        throw new Error("Role not found");
      }

      const roleId = roleRow.rows[0].id;

      const findUserQuery = `SELECT user_id, status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;
      const findUserRes = await client.query(findUserQuery, [email]);

      let userId;
      let userStatus;

      if (findUserRes.rows.length > 0) {
        userId = findUserRes.rows[0].user_id;
        userStatus = findUserRes.rows[0].status;
      } else {
        const publicUserId = generatePublicId();
        const insertUserQuery = `
          INSERT INTO users (
            email, name, username, status, public_user_id, password
          )
          VALUES (
            $1, $2, $3, 'PENDING_INVITE', $4, ''
          )
          RETURNING user_id, status;
        `;
        const insertRes = await client.query(insertUserQuery, [
          email,
          name,
          username || email.split("@")[0],
          publicUserId,
        ]);
        userId = insertRes.rows[0].user_id;
        userStatus = insertRes.rows[0].status;
      }

      await this.addWorkspaceMember(workspace_id, userId, roleId, "ACTIVE", invited_by, client);

      await client.query("COMMIT");
      return {
        email,
        invite_id: userId,
        role,
        status: userStatus,
        user_id: userId,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new WorkspaceMembersRepository();
