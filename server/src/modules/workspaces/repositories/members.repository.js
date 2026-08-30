const { executeQuery, getConnection } = require("@/database/connection");
const { generatePublicId } = require("@/utils/formatters.util");

class WorkspaceMembersRepository {
  async getMembershipRole(workspace_id, user_id) {
    const query = `
      SELECT role FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [workspace_id, user_id]);
    return rows[0]?.role ?? null;
  }

  async getMembershipsByUserIds(userIds, workspaceId) {
    if (!userIds || userIds.length === 0) return [];

    const query = `
      SELECT user_id::text, role, status
      FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = ANY($2::uuid[])
        AND deleted = false
    `;
    return await executeQuery(query, [workspaceId, userIds]);
  }

  async getWorkspaceMembers(workspace_id) {
    const query = `
      SELECT 
        om.*,
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
           'team_name', a.team_name,
           'role', am.role
         )), '[]'::json)
         FROM workspace_team_members am
         JOIN workspace_teams a ON a.id = am.team_id
         WHERE am.user_id = u1.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND am.workspace_id = $1) as teams,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = u1.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM workspace_members om
      LEFT JOIN users u1 ON om.user_id = u1.user_id
      LEFT JOIN users u2 ON om.invited_by = u2.user_id
      WHERE om.workspace_id = $1
        
        AND om.deleted = false
      ORDER BY 
        CASE om.role 
          WHEN 'SUPER_ADMIN' THEN 1
          WHEN 'ADMIN' THEN 2
          WHEN 'BILLING_MANAGER' THEN 3
          WHEN 'MEMBER' THEN 4
          WHEN 'GUEST' THEN 5
          ELSE 6
        END,
        om.created_at ASC;
    `;
    const results = await executeQuery(query, [workspace_id]);
    return results;
  }

  async countActiveMembersByRole(workspace_id, role) {
    const query = `
      SELECT COUNT(*)::int AS total
      FROM workspace_members
      WHERE workspace_id = $1
        
        AND role = UPPER($2)
        AND deleted = false;
    `;
    const results = await executeQuery(query, [workspace_id, role]);
    return results[0]?.total || 0;
  }

  async addWorkspaceMember(workspace_id, user_id, role, status, invited_by, txClient = null) {
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
            role = UPPER($3)::public.workspace_workspace_role_enum,
            status = UPPER($4)::public.workspace_member_status_enum,
            invited_by = $5,
            updated_at = now(),
            removed_at = NULL,
            removed_by = NULL
        WHERE id = (SELECT id FROM existing WHERE deleted = true)
        RETURNING *
      ),
      inserted AS (
        INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by)
        SELECT $1, $2,
          UPPER($3)::public.workspace_workspace_role_enum,
          UPPER($4)::public.workspace_member_status_enum,
          $5
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING *
      )
      SELECT * FROM reactivated
      UNION ALL
      SELECT * FROM inserted;
    `;
    const params = [workspace_id, user_id, role, status, inviterId];

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
        WHERE om.workspace_id = $1
          
          AND om.role IN ('ADMIN', 'SUPER_ADMIN')
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 2 AS priority
        FROM workspace_team_members om
        WHERE om.workspace_id = $1
          AND om.role = 'ADMIN'
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT om.user_id, 'CONTRIBUTOR' AS project_role, 3 AS priority
        FROM workspace_team_members om
        WHERE om.workspace_id = $1
          AND om.role = 'MEMBER'
          AND om.deleted = false
          AND om.user_id != $2::uuid
      ) sub
      ORDER BY user_id, priority ASC;
    `;

    return executeQuery(query, [workspaceId, excludeUserId]);
  }

  async removeWorkspaceMember(workspace_id, user_id) {
    const query = `
      WITH deleted_workspace_member AS (
        UPDATE workspace_members
        SET deleted = true, updated_at = now()
        WHERE workspace_id = $1 AND user_id = $2 
          AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        RETURNING *
      ),
      deleted_team_members AS (
        UPDATE workspace_team_members
        SET deleted = true, updated_at = now()
        WHERE workspace_id = $1 AND user_id = $2
          AND EXISTS (SELECT 1 FROM deleted_workspace_member)
        RETURNING *
      )
      SELECT * FROM deleted_workspace_member;
    `;
    const results = await executeQuery(query, [workspace_id, user_id]);
    return results[0];
  }

  async updateMemberRole(workspace_id, user_id, role) {
    const query = `
      UPDATE workspace_members
      SET role = UPPER($3)::public.workspace_workspace_role_enum,
          updated_at = now()
      WHERE workspace_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [workspace_id, user_id, role]);
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
      SELECT * FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = $2
        
        AND deleted = false
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
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM workspace_members om
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

      await this.addWorkspaceMember(workspace_id, userId, role, "ACTIVE", invited_by, client);

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
