const { executeQuery } = require("@/database/connection");

class TagsRepository {
  /**
   * Cria uma nova tag associada a um projeto ou organização.
   *
   * @param {Object} params
   * @param {string|null} [params.projectId=null] ID do projeto
   * @param {string|null} [params.orgId=null] ID da organização
   * @param {string} params.name Nome da tag
   * @param {string} params.color Cor em formato hexadecimal
   * @param {string} params.createdBy ID do usuário que criou
   * @returns {Promise<any>}
   */
  async createTag({ projectId = null, orgId = null, name, color, createdBy }) {
    const query = `
      INSERT INTO tags (project_id, organization_id, name, color_hex, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      projectId,
      orgId,
      name,
      color,
      createdBy,
    ]);
    return result[0];
  }

  /**
   * Busca tags de um projeto ou organização.
   *
   * @param {Object} params
   * @param {string|null} [params.projectId=null] ID do projeto
   * @param {string|null} [params.orgId=null] ID da organização
   * @returns {Promise<any[]>}
   */
  async getTags({ projectId = null, orgId = null }) {
    const query = `
      SELECT * FROM tags
      WHERE deleted = false
        AND (
          ($1::uuid IS NOT NULL AND project_id = $1)
          OR ($1::uuid IS NULL AND $2::uuid IS NOT NULL AND organization_id = $2)
        )
      ORDER BY name ASC;
    `;
    return await executeQuery(query, [projectId, orgId]);
  }

  /**
   * Atualiza uma tag existente.
   *
   * @param {string} tagId ID da tag
   * @param {Object} params
   * @param {string|null} [params.projectId=null] ID do projeto
   * @param {string|null} [params.orgId=null] ID da organização
   * @param {Object} params.updates Dados a atualizar
   * @param {string} [params.updates.name] Novo nome
   * @param {string} [params.updates.color] Nova cor
   * @returns {Promise<any>}
   */
  async updateTag(tagId, { projectId = null, orgId = null, updates }) {
    const { name, color } = updates;
    const query = `
      UPDATE tags
      SET name = COALESCE($1, name),
          color_hex = COALESCE($2, color_hex),
          updated_at = now()
      WHERE id = $3
        AND deleted = false
        AND (
          ($4::uuid IS NOT NULL AND project_id = $4)
          OR ($4::uuid IS NULL AND $5::uuid IS NOT NULL AND organization_id = $5)
        )
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      name,
      color,
      tagId,
      projectId,
      orgId,
    ]);
    return result[0];
  }

  /**
   * Exclui (soft delete) uma tag do sistema.
   *
   * @param {string} tagId ID da tag a deletar
   * @param {Object} params
   * @param {string|null} [params.projectId=null] ID do projeto
   * @param {string|null} [params.orgId=null] ID da organização
   * @param {string} params.deletedBy ID do usuário que excluiu
   * @returns {Promise<any>}
   */
  async deleteTag(tagId, { projectId = null, orgId = null, deletedBy }) {
    const query = `
      UPDATE tags
      SET deleted = true, deleted_at = now(), deleted_by = $1
      WHERE id = $2
        AND (
          ($3::uuid IS NOT NULL AND project_id = $3)
          OR ($3::uuid IS NULL AND $4::uuid IS NOT NULL AND organization_id = $4)
        )
      RETURNING *;
    `;
    const result = await executeQuery(query, [
      deletedBy,
      tagId,
      projectId,
      orgId,
    ]);
    return result[0];
  }
}

module.exports = new TagsRepository();
