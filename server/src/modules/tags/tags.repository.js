const { executeQuery, rowCount } = require("@/database/connection");

class TagsRepository {
  async createTag(orgId, name, color, createdBy) {
    const query = `
      INSERT INTO tags (org_id, name, color_hex, user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await executeQuery(query, [orgId, name, color, createdBy]);
    return result[0];
  }

  async getTagsByOrgId(orgId) {
    const query = `
      SELECT * FROM tags
      WHERE org_id = $1 AND deleted = false
      ORDER BY name ASC;
    `;
    return await executeQuery(query, [orgId]);
  }

  async updateTag(tagId, orgId, updates) {
    const { name, color } = updates;
    const query = `
      UPDATE tags
      SET name = COALESCE($1, name),
          color_hex = COALESCE($2, color_hex),
          updated_at = now()
      WHERE id = $3 AND org_id = $4 AND deleted = false
      RETURNING *;
    `;
    const result = await executeQuery(query, [name, color, tagId, orgId]);
    return result[0];
  }

  async deleteTag(tagId, orgId, deletedBy) {
    const query = `
      UPDATE tags
      SET deleted = true, deleted_at = now(), deleted_by = $1
      WHERE id = $2 AND org_id = $3
      RETURNING *;
    `;
    const result = await executeQuery(query, [deletedBy, tagId, orgId]);
    return result[0];
  }
}

module.exports = new TagsRepository();
