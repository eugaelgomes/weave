const { executeQuery, rowCount } = require("@/services/db");

class AdminRepository {
  // ==================== DASHBOARD ====================

  async getDashboardStats() {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted = false) AS total_users,
        (SELECT COUNT(*) FROM users WHERE deleted = false AND email_verified = true) AS verified_users,
        (SELECT COUNT(*) FROM users WHERE deleted = true) AS deleted_users,
        (SELECT COUNT(*) FROM organizations WHERE deleted = false) AS total_organizations,
        (SELECT COUNT(*) FROM projects WHERE deleted = false) AS total_projects,
        (SELECT COUNT(*) FROM notes WHERE deleted = false) AS total_notes,
        (SELECT COUNT(*) FROM users WHERE deleted = false AND created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
        (SELECT COUNT(*) FROM organizations WHERE deleted = false AND created_at >= NOW() - INTERVAL '30 days') AS new_orgs_30d
    `;
    const results = await executeQuery(query);
    return results[0];
  }

  // ==================== USERS ====================

  async listUsers({ page = 1, limit = 20, search = "", status = "all", orderBy = "created_at", order = "DESC" }) {
    const offset = (page - 1) * limit;
    const allowedOrderBy = ["created_at", "name", "email", "last_login", "updated_at"];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : "created_at";
    const safeOrder = order === "ASC" ? "ASC" : "DESC";

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === "active") {
      whereClause += ` AND u.deleted = false`;
    } else if (status === "deleted") {
      whereClause += ` AND u.deleted = true`;
    } else if (status === "verified") {
      whereClause += ` AND u.deleted = false AND u.email_verified = true`;
    } else if (status === "unverified") {
      whereClause += ` AND u.deleted = false AND u.email_verified = false`;
    }

    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = parseInt(countResult[0].total, 10);

    const dataQuery = `
      SELECT
        u.user_id, u.name, u.email, u.username,
        u.email_verified, u.deleted, u.created_at, u.updated_at,
        u.last_login, u.auth_with_google, u.auth_with_github,
        u.private_profile, u.timezone, u.org_id, u.plan_id,
        CASE WHEN u.avatar_url IS NOT NULL THEN true ELSE false END AS has_avatar,
        o.org_name,
        p.name AS plan_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN plans p ON u.plan_id = p.plan_id
      ${whereClause}
      ORDER BY u.${safeOrderBy} ${safeOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const users = await executeQuery(dataQuery, params);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId) {
    const query = `
      SELECT
        u.user_id, u.name, u.email, u.username,
        u.avatar_url, u.created_at, u.updated_at,
        u.last_login, u.email_verified, u.deleted,
        u.auth_with_google, u.auth_with_github,
        u.theme_mode, u.phone_number, u.birth_date,
        u.private_profile, u.timezone, u.org_id, u.plan_id,
        u.email_verified_at,
        o.org_name, o.unique_name AS org_unique_name,
        p.name AS plan_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN plans p ON u.plan_id = p.plan_id
      WHERE u.user_id = $1
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async getUserStats(userId) {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM notes WHERE user_id = $1 AND deleted = false) AS total_notes,
        (SELECT COUNT(*) FROM projects WHERE user_id = $1 AND deleted = false) AS total_projects,
        (SELECT COUNT(*) FROM note_collaborators WHERE user_id = $1 AND removed = false) AS shared_notes,
        (SELECT COUNT(*) FROM organizations_members WHERE user_id = $1 AND deleted = false) AS org_memberships
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async updateUser(userId, fields) {
    const allowedFields = [
      "name", "email", "username", "email_verified",
      "deleted", "private_profile", "phone_number",
      "birth_date", "timezone", "org_id", "plan_id",
    ];

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING user_id, name, email, username, deleted, email_verified
    `;

    const results = await executeQuery(query, params);
    return results[0];
  }

  async softDeleteUser(userId) {
    const query = `
      UPDATE users SET deleted = true, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, name, email
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async restoreUser(userId) {
    const query = `
      UPDATE users SET deleted = false, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, name, email
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  // ==================== ORGANIZATIONS ====================

  async listOrganizations({ page = 1, limit = 20, search = "", status = "all", orderBy = "created_at", order = "DESC" }) {
    const offset = (page - 1) * limit;
    const allowedOrderBy = ["created_at", "org_name", "updated_at"];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : "created_at";
    const safeOrder = order === "ASC" ? "ASC" : "DESC";

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (o.org_name ILIKE $${paramIndex} OR o.unique_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === "active") {
      whereClause += ` AND o.deleted = false`;
    } else if (status === "deleted") {
      whereClause += ` AND o.deleted = true`;
    }

    const countQuery = `SELECT COUNT(*) AS total FROM organizations o ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = parseInt(countResult[0].total, 10);

    const dataQuery = `
      SELECT
        o.id, o.org_name, o.unique_name, o.description,
        o.deleted, o.created_at, o.updated_at,
        o.user_id AS owner_id, o.plan_id,
        CASE WHEN o.logo_url IS NOT NULL THEN true ELSE false END AS has_logo,
        u.name AS owner_name, u.email AS owner_email,
        p.name AS plan_name,
        (SELECT COUNT(*) FROM organizations_members om WHERE om.org_id = o.id AND om.deleted = false) AS member_count
      FROM organizations o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN plans p ON o.plan_id = p.plan_id
      ${whereClause}
      ORDER BY o.${safeOrderBy} ${safeOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const organizations = await executeQuery(dataQuery, params);

    return {
      organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrganizationById(orgId) {
    const query = `
      SELECT
        o.*,
        u.name AS owner_name, u.email AS owner_email, u.username AS owner_username,
        p.name AS plan_name,
        (SELECT COUNT(*) FROM organizations_members om WHERE om.org_id = o.id AND om.deleted = false) AS member_count
      FROM organizations o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN plans p ON o.plan_id = p.plan_id
      WHERE o.id = $1
    `;
    const results = await executeQuery(query, [orgId]);
    return results[0];
  }

  async getOrganizationMembers(orgId) {
    const query = `
      SELECT
        om.id AS membership_id, om.role, om.status,
        om.created_at AS joined_at, om.suspended,
        u.user_id, u.name, u.email, u.username,
        CASE WHEN u.avatar_url IS NOT NULL THEN true ELSE false END AS has_avatar,
        inv.name AS invited_by_name
      FROM organizations_members om
      JOIN users u ON om.user_id = u.user_id
      LEFT JOIN users inv ON om.invited_by = inv.user_id
      WHERE om.org_id = $1 AND om.deleted = false
      ORDER BY om.created_at ASC
    `;
    return await executeQuery(query, [orgId]);
  }

  async updateOrganization(orgId, fields) {
    const allowedFields = [
      "org_name", "unique_name", "description",
      "deleted", "plan_id",
    ];

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(orgId);

    const query = `
      UPDATE organizations
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, org_name, unique_name, deleted
    `;

    const results = await executeQuery(query, params);
    return results[0];
  }

  async softDeleteOrganization(orgId) {
    const query = `
      UPDATE organizations SET deleted = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, org_name
    `;
    const results = await executeQuery(query, [orgId]);
    return results[0];
  }

  async restoreOrganization(orgId) {
    const query = `
      UPDATE organizations SET deleted = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, org_name
    `;
    const results = await executeQuery(query, [orgId]);
    return results[0];
  }

  // ==================== PLANS ====================

  async listPlans() {
    const query = `
      SELECT
        plan_id, name, description, details, plan_value, currency,
        billing_cycle, is_active, created_at, updated_at, personalized_for_client, personalized_client,
        (SELECT COUNT(*) FROM users WHERE plan_id = plans.plan_id) AS user_count,
        (SELECT COUNT(*) FROM organizations WHERE plan_id = plans.plan_id) AS org_count
      FROM plans
      ORDER BY created_at ASC
    `;
    return await executeQuery(query);
  }
}

module.exports = new AdminRepository();
