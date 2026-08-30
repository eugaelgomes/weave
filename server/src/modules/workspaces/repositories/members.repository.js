const { executeQuery, getConnection } = require("@/database/connection");
const { generatePublicId } = require("@/utils/formatters.util");

class WorkspaceMembersRepository {
  async getMembershipRole(workspace_id, user_id) {
    const query = `
      SELECT array_agg(r.name) as roles 
      FROM workspace_members om
      JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      JOIN workspaces_roles r ON r.id = wmr.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = $2
        AND om.deleted = false
      GROUP BY om.id
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [workspace_id, user_id]);
    return rows[0]?.roles ?? [];
  }

  async getMembershipsByUserIds(userIds, workspaceId) {
    if (!userIds || userIds.length === 0) return [];

    const query = `
      SELECT om.user_id::text, 
             array_agg(r.name) as roles, 
             om.status
      FROM workspace_members om
      JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      JOIN workspaces_roles r ON r.id = wmr.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = ANY($2::uuid[])
        AND om.deleted = false
      GROUP BY om.id, om.user_id, om.status
    `;
    return await executeQuery(query, [workspaceId, userIds]);
  }

  async getWorkspaceMembers(
    workspace_id,
    { page = 1, limit = 50, search = "", role_id = null, status = null } = {}
  ) {
    const offset = (page - 1) * limit;

    const query = `
      WITH filtered_members AS (
        SELECT 
          om.id,
          om.workspace_id,
          om.user_id,
          om.status,
          om.invited_by,
          om.created_at,
          om.updated_at,
          u1.name,
          u1.username,
          u1.email,
          u1.avatar_url,
          u2.name as inviter_name,
          u2.username as inviter_username,
          u2.avatar_url as inviter_avatar_url
        FROM workspace_members om
        JOIN users u1 ON om.user_id = u1.user_id
        LEFT JOIN users u2 ON om.invited_by = u2.user_id
        WHERE om.workspace_id = $1
          AND om.deleted = false
          AND ($2::text = '' OR u1.name ILIKE '%' || $2 || '%' OR u1.email ILIKE '%' || $2 || '%')
          AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM workspace_member_roles wmr WHERE wmr.workspace_member_id = om.id AND wmr.role_id = $3))
          AND ($4::text IS NULL OR om.status::text = $4)
      ),
      total_count AS (
        SELECT COUNT(*) as count FROM filtered_members
      ),
      paginated_members AS (
        SELECT * FROM filtered_members
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
      )
      SELECT 
        pm.*,
        (SELECT count FROM total_count) as total_count,
        (
          SELECT array_agg(DISTINCT r.name)
          FROM workspace_member_roles wmr 
          JOIN workspaces_roles r ON r.id = wmr.role_id
          WHERE wmr.workspace_member_id = pm.id
        ) as roles,
        (
          SELECT jsonb_agg(DISTINCT perm)
          FROM workspace_member_roles wmr2
          JOIN workspaces_roles r2 ON r2.id = wmr2.role_id
          CROSS JOIN jsonb_array_elements(r2.permissions) as perm
          WHERE wmr2.workspace_member_id = pm.id
        ) as accumulated_permissions,
        (SELECT COUNT(*) 
         FROM notes n 
         WHERE n.user_id = pm.user_id AND n.deleted = false) as notes_count,
        (SELECT COALESCE(json_agg(json_build_object(
           'project_id', p.id::text,
           'project_name', p.title,
           'role', prm.role
         )), '[]'::json)
         FROM project_members prm
         JOIN projects p ON p.id = prm.project_id
         WHERE prm.user_id = pm.user_id
           AND prm.deleted = false 
           AND p.deleted = false) as projects,
        (SELECT COALESCE(json_agg(json_build_object(
           'team_id', a.id::text,
           'team_name', a.name,
           'role', tr.name
         )), '[]'::json)
         FROM team_members am
         JOIN teams a ON a.id = am.team_id
         JOIN workspaces_roles tr ON tr.id = am.role_id
         WHERE am.user_id = pm.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND a.workspace_id = pm.workspace_id) as teams,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = pm.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM paginated_members pm
      ORDER BY pm.created_at DESC;
    `;

    const results = await executeQuery(query, [
      workspace_id,
      search || "",
      role_id,
      status,
      limit,
      offset,
    ]);
    return results;
  }

  async countActiveMembersByRole(workspace_id, role) {
    const query = `
      SELECT COUNT(DISTINCT om.id)::int AS total
      FROM workspace_members om
      JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      JOIN workspaces_roles r ON r.id = wmr.role_id
      WHERE om.workspace_id = $1
        AND r.name = UPPER($2)
        AND om.deleted = false;
    `;
    const results = await executeQuery(query, [workspace_id, role]);
    return results[0]?.total || 0;
  }

  async addWorkspaceMember(workspace_id, user_id, role_ids, status, invited_by, txClient = null) {
    const roleIdsArray = Array.isArray(role_ids) ? role_ids : [role_ids];
    const inviterId = invited_by || user_id;
    const client = txClient || (await getConnection());

    try {
      if (!txClient) await client.query("BEGIN");

      const upsertMemberQuery = `
        INSERT INTO workspace_members (workspace_id, user_id, status, invited_by, deleted, updated_at)
        VALUES ($1, $2, UPPER($3)::public.workspace_member_status_enum, $4, false, now())
        ON CONFLICT (workspace_id, user_id) 
        DO UPDATE SET deleted = false, status = EXCLUDED.status, updated_at = now()
        RETURNING *;
      `;

      const { rows: memberRows } = await client.query(upsertMemberQuery, [
        workspace_id,
        user_id,
        status,
        inviterId,
      ]);
      const member = memberRows[0];

      // Delete existing roles
      await client.query("DELETE FROM workspace_member_roles WHERE workspace_member_id = $1", [
        member.id,
      ]);

      // Insert new roles
      if (roleIdsArray.length > 0) {
        const insertRolesQuery = `
          INSERT INTO workspace_member_roles (workspace_member_id, role_id)
          SELECT $1, unnest($2::uuid[])
        `;
        await client.query(insertRolesQuery, [member.id, roleIdsArray]);
      }

      if (!txClient) await client.query("COMMIT");
      return member;
    } catch (err) {
      if (!txClient) await client.query("ROLLBACK");
      throw err;
    } finally {
      if (!txClient) client.release();
    }
  }

  async getAutoAssignableProjectMembers(workspaceId, excludeUserId) {
    const query = `
      SELECT DISTINCT ON (user_id) user_id::text, project_role
      FROM (
        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 1 AS priority
        FROM workspace_members om
        JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
        JOIN workspaces_roles r ON r.id = wmr.role_id
        WHERE om.workspace_id = $1
          AND r.permissions ? 'manage_workspace'
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT am.user_id, 'PROJECT_MANAGER' AS project_role, 2 AS priority
        FROM team_members am
        JOIN teams a ON a.id = am.team_id
        JOIN workspaces_roles tr ON tr.id = am.role_id
        WHERE a.workspace_id = $1
          AND tr.permissions ? 'manage_teams'
          AND am.deleted = false
          AND am.user_id != $2::uuid

        UNION ALL

        SELECT am.user_id, 'CONTRIBUTOR' AS project_role, 3 AS priority
        FROM team_members am
        JOIN teams a ON a.id = am.team_id
        JOIN workspaces_roles tr ON tr.id = am.role_id
        WHERE a.workspace_id = $1
          AND NOT (tr.permissions ? 'manage_teams')
          AND am.deleted = false
          AND am.user_id != $2::uuid
      ) sub
      ORDER BY user_id, priority ASC;
    `;

    return executeQuery(query, [workspaceId, excludeUserId]);
  }

  async removeWorkspaceMember(workspace_id, user_id) {
    const query = `
      WITH member_permissions AS (
        SELECT om.id, bool_or(r.permissions ? 'manage_workspace') as is_admin
        FROM workspace_members om
        LEFT JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
        LEFT JOIN workspaces_roles r ON r.id = wmr.role_id
        WHERE om.workspace_id = $1 AND om.user_id = $2
        GROUP BY om.id
      ),
      deleted_workspace_member AS (
        UPDATE workspace_members om
        SET deleted = true, updated_at = now()
        FROM member_permissions mp
        WHERE om.id = mp.id AND mp.is_admin = false
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

  async updateMemberRole(workspace_id, user_id, role_ids) {
    const roleIdsArray = Array.isArray(role_ids) ? role_ids : [role_ids];
    const client = await getConnection();

    try {
      await client.query("BEGIN");

      const findMember = await client.query(
        "SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND deleted = false LIMIT 1",
        [workspace_id, user_id]
      );

      if (findMember.rows.length === 0) {
        throw new Error("Member not found");
      }

      const memberId = findMember.rows[0].id;

      // Assume role_ids are UUIDs. If they are names, we would need to map them here.
      // Assuming the controller handles validation and mapping to UUIDs.

      await client.query("DELETE FROM workspace_member_roles WHERE workspace_member_id = $1", [
        memberId,
      ]);

      if (roleIdsArray.length > 0) {
        const insertRolesQuery = `
          INSERT INTO workspace_member_roles (workspace_member_id, role_id)
          SELECT $1, unnest($2::uuid[])
        `;
        await client.query(insertRolesQuery, [memberId, roleIdsArray]);
      }

      const updateMember = await client.query(
        "UPDATE workspace_members SET updated_at = now() WHERE id = $1 RETURNING *",
        [memberId]
      );

      await client.query("COMMIT");
      return updateMember.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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
      SELECT om.*, array_agg(r.name) as roles 
      FROM workspace_members om
      LEFT JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      LEFT JOIN workspaces_roles r ON r.id = wmr.role_id
      WHERE om.workspace_id = $1
        AND om.user_id = $2
        AND om.deleted = false
      GROUP BY om.id
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
      SELECT om.*, array_agg(r.name) as roles, u.name, u.username, u.email, u.avatar_url
      FROM workspace_members om
      LEFT JOIN workspace_member_roles wmr ON wmr.workspace_member_id = om.id
      LEFT JOIN workspaces_roles r ON r.id = wmr.role_id
      LEFT JOIN users u ON om.user_id = u.user_id
      INNER JOIN workspaces o ON o.id = om.workspace_id
      WHERE om.workspace_id = $1 AND om.user_id = o.user_id
        AND om.deleted = false
      GROUP BY om.id, u.user_id
      LIMIT 1;
    `;
    const results = await executeQuery(query, [workspace_id]);
    return results[0] || null;
  }

  async createWorkspaceInvite(
    workspace_id,
    email,
    roleIds,
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

      await this.addWorkspaceMember(workspace_id, userId, roleIds, "ACTIVE", invited_by, client);

      await client.query("COMMIT");
      return {
        email,
        invite_id: userId,
        roles: roleIds,
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
