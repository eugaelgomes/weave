const { executeQuery, rowCount } = require("@/database/connection");

class TaskPrioritiesRepository {
  async createPriority(orgId, name, color, level, createdBy) {
    const query = `
      INSERT INTO task_priorities (org_id, name, color_hex, sort_order, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      orgId,
      name,
      color,
      level,
      createdBy,
    ]);
    return result[0];
  }

  async getPrioritiesByOrgId(orgId) {
    const query = `
      SELECT * FROM task_priorities
      WHERE org_id = $1 AND deleted = false
      ORDER BY sort_order ASC;
    `;
    return await executeQuery(query, [orgId]);
  }

  async updatePriority(priorityId, orgId, updates) {
    const { name, color, level } = updates;
    const query = `
      UPDATE task_priorities
      SET name = COALESCE($1, name),
          color_hex = COALESCE($2, color_hex),
          sort_order = COALESCE($3, sort_order),
          updated_at = now()
      WHERE id = $4 AND org_id = $5 AND deleted = false
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      name,
      color,
      level,
      priorityId,
      orgId,
    ]);
    return result[0];
  }

  async deletePriority(priorityId, orgId, deletedBy) {
    const query = `
      UPDATE task_priorities
      SET deleted = true, deleted_at = now(), deleted_by = $1
      WHERE id = $2 AND org_id = $3
      RETURNING *;
    `;
    const result = await executeQuery(query, [deletedBy, priorityId, orgId]);
    return result[0];
  }
}

module.exports = new TaskPrioritiesRepository();
