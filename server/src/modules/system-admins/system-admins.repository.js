const { executeQuery } = require("@/database/connection");

class SystemAdminsRepository {
  // ==================== LISTAR ====================

  async listAdmins({ page = 1, limit = 20, search = "", status = "all", orderBy = "created_at", order = "DESC" }) {
    const offset = (page - 1) * limit;
    const allowedOrderBy = ["created_at", "name", "email", "role", "updated_at"];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : "created_at";
    const safeOrder = order === "ASC" ? "ASC" : "DESC";

    let whereClause = "WHERE is_deleted = false";
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === "active") {
      whereClause += ` AND is_active = true AND is_suspended = false`;
    } else if (status === "suspended") {
      whereClause += ` AND is_suspended = true`;
    } else if (status === "inactive") {
      whereClause += ` AND is_active = false`;
    }

    const countQuery = `SELECT COUNT(*) AS total FROM system_admins ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = parseInt(countResult[0].total, 10);

    const dataQuery = `
      SELECT
        sa.id, sa.email, sa.name, sa.role, sa.user_function,
        sa.is_active, sa.is_suspended, sa.created_at, sa.updated_at,
        creator.name AS created_by_name
      FROM system_admins sa
      LEFT JOIN system_admins creator ON sa.created_by = creator.id
      ${whereClause}
      ORDER BY sa.${safeOrderBy} ${safeOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const admins = await executeQuery(dataQuery, params);

    return {
      admins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== BUSCAR ====================

  async getAdminById(adminId) {
    const query = `
      SELECT
        sa.id, sa.email, sa.name, sa.role, sa.user_function,
        sa.is_active, sa.is_suspended, sa.is_deleted,
        sa.created_at, sa.updated_at, sa.deleted_at,
        creator.name AS created_by_name, creator.email AS created_by_email
      FROM system_admins sa
      LEFT JOIN system_admins creator ON sa.created_by = creator.id
      WHERE sa.id = $1 AND sa.is_deleted = false
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  // ==================== CRIAR ====================

  async createAdmin(data, createdBy) {
    const { email, name, role = "read_only", user_function } = data;

    // Verificar se email já existe
    const existingQuery = `
      SELECT id FROM system_admins 
      WHERE email = $1 AND is_deleted = false
    `;
    const existing = await executeQuery(existingQuery, [email]);
    if (existing.length > 0) {
      throw new Error("Email já cadastrado");
    }

    const query = `
      INSERT INTO system_admins (email, name, role, user_function, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, user_function, created_at
    `;
    const results = await executeQuery(query, [email, name, role, user_function, createdBy]);
    return results[0];
  }

  // ==================== ATUALIZAR ====================

  async updateAdmin(adminId, fields) {
    const allowedFields = ["name", "role", "user_function", "is_active"];

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

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(adminId);

    const query = `
      UPDATE system_admins
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND is_deleted = false
      RETURNING id, email, name, role, user_function, is_active
    `;

    const results = await executeQuery(query, params);
    return results[0];
  }

  // ==================== SUSPENDER/ATIVAR ====================

  async suspendAdmin(adminId) {
    const query = `
      UPDATE system_admins 
      SET is_suspended = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = false
      RETURNING id, email, name
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  async activateAdmin(adminId) {
    const query = `
      UPDATE system_admins 
      SET is_suspended = false, is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = false
      RETURNING id, email, name
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  // ==================== DELETAR ====================

  async softDeleteAdmin(adminId) {
    const query = `
      UPDATE system_admins 
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = false
      RETURNING id, email, name
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  async restoreAdmin(adminId) {
    const query = `
      UPDATE system_admins 
      SET is_deleted = false, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = true
      RETURNING id, email, name
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  // ==================== ESTATÍSTICAS ====================

  async getAdminStats() {
    const query = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_active = true AND is_suspended = false) AS active,
        COUNT(*) FILTER (WHERE is_suspended = true) AS suspended,
        COUNT(*) FILTER (WHERE role = 'super_admin') AS super_admins,
        COUNT(*) FILTER (WHERE role = 'manager') AS managers,
        COUNT(*) FILTER (WHERE role = 'support') AS support,
        COUNT(*) FILTER (WHERE role = 'read_only') AS read_only
      FROM system_admins
      WHERE is_deleted = false
    `;
    const results = await executeQuery(query);
    return results[0];
  }
}

module.exports = new SystemAdminsRepository();
