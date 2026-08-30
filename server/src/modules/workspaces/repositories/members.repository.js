const { executeQuery, getConnection } = require("@/database/connection");
const { generatePublicId } = require("@/utils/formatters.util");

class OrganizationMembersRepository {
  async getMembershipRole(organization_id, user_id) {
    const query = `
      SELECT role FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [organization_id, user_id]);
    return rows[0]?.role ?? null;
  }

  async getMembershipsByUserIds(userIds, organizationId) {
    if (!userIds || userIds.length === 0) return [];

    const query = `
      SELECT user_id::text, role, status
      FROM organization_members
      WHERE organization_id = $1
        AND user_id = ANY($2::uuid[])
        AND deleted = false
    `;
    return await executeQuery(query, [organizationId, userIds]);
  }

  async getOrganizationMembers(organization_id) {
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
           'area_id', a.id::text,
           'area_name', a.area_name,
           'role', am.role
         )), '[]'::json)
         FROM organization_area_members am
         JOIN organization_areas a ON a.id = am.area_id
         WHERE am.user_id = u1.user_id
           AND am.deleted = false 
           AND a.deleted = false
           AND am.organization_id = $1) as teams,
        (SELECT ul.created_at as last_login_at
         FROM user_logs ul
         WHERE ul.user_id = u1.user_id 
           AND ul.log_type = 'AUTH_LOGIN'
         ORDER BY ul.created_at DESC
         LIMIT 1) as last_login
      FROM organization_members om
      LEFT JOIN users u1 ON om.user_id = u1.user_id
      LEFT JOIN users u2 ON om.invited_by = u2.user_id
      WHERE om.organization_id = $1
        
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
    const results = await executeQuery(query, [organization_id]);
    return results;
  }

  async countActiveMembersByRole(organization_id, role) {
    const query = `
      SELECT COUNT(*)::int AS total
      FROM organization_members
      WHERE organization_id = $1
        
        AND role = UPPER($2)
        AND deleted = false;
    `;
    const results = await executeQuery(query, [organization_id, role]);
    return results[0]?.total || 0;
  }

  async addOrganizationMember(organization_id, user_id, role, status, invited_by, txClient = null) {
    const inviterId = invited_by || user_id;
    const query = `
      WITH existing AS (
        SELECT id, deleted
        FROM organization_members
        WHERE organization_id = $1
          AND user_id = $2
          
        LIMIT 1
      ),
      reactivated AS (
        UPDATE organization_members
        SET deleted = false,
            role = UPPER($3)::public.organization_workspace_role_enum,
            status = UPPER($4)::public.organization_member_status_enum,
            invited_by = $5,
            updated_at = now(),
            removed_at = NULL,
            removed_by = NULL
        WHERE id = (SELECT id FROM existing WHERE deleted = true)
        RETURNING *
      ),
      inserted AS (
        INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
        SELECT $1, $2,
          UPPER($3)::public.organization_workspace_role_enum,
          UPPER($4)::public.organization_member_status_enum,
          $5
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING *
      )
      SELECT * FROM reactivated
      UNION ALL
      SELECT * FROM inserted;
    `;
    const params = [organization_id, user_id, role, status, inviterId];

    if (txClient) {
      const { rows } = await txClient.query(query, params);
      return rows[0];
    }

    const results = await executeQuery(query, params);
    return results[0];
  }

  async getAutoAssignableProjectMembers(organizationId, excludeUserId) {
    const query = `
      SELECT DISTINCT ON (user_id) user_id::text, project_role
      FROM (
        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 1 AS priority
        FROM organization_members om
        WHERE om.organization_id = $1
          
          AND om.role IN ('ADMIN', 'SUPER_ADMIN')
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT om.user_id, 'PROJECT_MANAGER' AS project_role, 2 AS priority
        FROM organization_area_members om
        WHERE om.organization_id = $1
          AND om.role = 'ADMIN'
          AND om.deleted = false
          AND om.user_id != $2::uuid

        UNION ALL

        SELECT om.user_id, 'CONTRIBUTOR' AS project_role, 3 AS priority
        FROM organization_area_members om
        WHERE om.organization_id = $1
          AND om.role = 'MEMBER'
          AND om.deleted = false
          AND om.user_id != $2::uuid
      ) sub
      ORDER BY user_id, priority ASC;
    `;

    return executeQuery(query, [organizationId, excludeUserId]);
  }

  async removeOrganizationMember(organization_id, user_id) {
    const query = `
      WITH deleted_org_member AS (
        UPDATE organization_members
        SET deleted = true, updated_at = now()
        WHERE organization_id = $1 AND user_id = $2 
          AND role NOT IN ('ADMIN', 'SUPER_ADMIN')
        RETURNING *
      ),
      deleted_area_members AS (
        UPDATE organization_area_members
        SET deleted = true, updated_at = now()
        WHERE organization_id = $1 AND user_id = $2
          AND EXISTS (SELECT 1 FROM deleted_org_member)
        RETURNING *
      )
      SELECT * FROM deleted_org_member;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async updateMemberRole(organization_id, user_id, role) {
    const query = `
      UPDATE organization_members
      SET role = UPPER($3)::public.organization_workspace_role_enum,
          updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id, role]);
    return results[0];
  }

  async updateMemberStatus(organization_id, user_id, status) {
    const query = `
      UPDATE organization_members
      SET status = UPPER($3)::public.organization_member_status_enum,
          updated_at = now()
      WHERE organization_id = $1 AND user_id = $2 
      RETURNING *;
    `;
    const results = await executeQuery(query, [organization_id, user_id, status]);
    return results[0];
  }

  async getOrganizationMember(organization_id, user_id) {
    const query = `
      SELECT * FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results[0];
  }

  async isMember(organization_id, user_id) {
    const query = `
      SELECT 1 FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id, user_id]);
    return results.length > 0;
  }

  async getOrganizationOwner(organization_id) {
    const query = `
      SELECT om.*, u.name, u.username, u.email, u.avatar_url
      FROM organization_members om
      LEFT JOIN users u ON om.user_id = u.user_id
      INNER JOIN workspaces o ON o.id = om.organization_id
      WHERE om.organization_id = $1 AND om.user_id = o.user_id
        
        AND om.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [organization_id]);
    return results[0] || null;
  }

  async createOrgInvite(
    organization_id,
    email,
    role,
    invited_by,
    name = null,
    username = null,
    _target_areas = []
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

      await this.addOrganizationMember(organization_id, userId, role, "ACTIVE", invited_by, client);

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

module.exports = new OrganizationMembersRepository();
