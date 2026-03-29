const { executeQuery, rowCount } = require("@/database/connection");

class TaskPrioritiesRepository {
  /**
   * Cria uma nova prioridade de tarefas (Task Priority).
   * 
   * @param {Object} params
   * @param {string|null} [params.projectId=null]
   * @param {string|null} [params.orgId=null]
   * @param {string} params.name
   * @param {string} params.color
   * @param {number} params.level
   * @param {string} params.createdBy
   * @returns {Promise<any>}
   */
  async createPriority({
    projectId = null,
    orgId = null,
    name,
    color,
    level,
    createdBy,
  }) {
    const query = `
      INSERT INTO task_priorities (project_id, org_id, name, color_hex, sort_order, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      projectId,
      orgId,
      name,
      color,
      level,
      createdBy,
    ]);
    return result[0];
  }

  /**
   * Busca as prioridades (Task Priorities) por contexto de projeto ou organização.
   * 
   * @param {Object} params
   * @param {string|null} [params.projectId=null]
   * @param {string|null} [params.orgId=null]
   * @returns {Promise<any[]>}
   */
  async getPriorities({ projectId = null, orgId = null }) {
    const query = `
      SELECT * FROM task_priorities
      WHERE deleted = false
        AND (
          ($1::uuid IS NOT NULL AND project_id = $1)
          OR ($1::uuid IS NULL AND $2::uuid IS NOT NULL AND org_id = $2)
        )
      ORDER BY sort_order ASC;
    `;
    return await executeQuery(query, [projectId, orgId]);
  }

  /**
   * Atualiza os dados de uma prioridade existente.
   * 
   * @param {string} priorityId
   * @param {Object} params
   * @param {string|null} [params.projectId=null]
   * @param {string|null} [params.orgId=null]
   * @param {Object} params.updates Dados da atualização
   * @param {string} [params.updates.name]
   * @param {string} [params.updates.color]
   * @param {number} [params.updates.level]
   * @returns {Promise<any>}
   */
  async updatePriority(priorityId, { projectId = null, orgId = null, updates }) {
    const { name, color, level } = updates;
    const query = `
      UPDATE task_priorities
      SET name = COALESCE($1, name),
          color_hex = COALESCE($2, color_hex),
          sort_order = COALESCE($3, sort_order),
          updated_at = now()
      WHERE id = $4
        AND deleted = false
        AND (
          ($5::uuid IS NOT NULL AND project_id = $5)
          OR ($5::uuid IS NULL AND $6::uuid IS NOT NULL AND org_id = $6)
        )
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      name,
      color,
      level,
      priorityId,
      projectId,
      orgId,
    ]);
    return result[0];
  }

    /**
   * Remove de forma lógica (soft delete) uma prioridade de tarefas.
   *
   * @param {string} priorityId
   * @param {Object} params
   * @param {string|null} [params.projectId=null]
   * @param {string|null} [params.orgId=null]
   * @param {string} params.deletedBy User ID responsável pela deleção
   * @returns {Promise<any>}
   */
  async deletePriority(priorityId, { projectId = null, orgId = null, deletedBy }) {
    const query = `
      UPDATE task_priorities
      SET deleted = true, deleted_at = now(), deleted_by = $1
      WHERE id = $2
        AND (
          ($3::uuid IS NOT NULL AND project_id = $3)
          OR ($3::uuid IS NULL AND $4::uuid IS NOT NULL AND org_id = $4)
        )
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      deletedBy,
      priorityId,
      projectId,
      orgId,
    ]);
    return result[0];
  }
}

module.exports = new TaskPrioritiesRepository();
