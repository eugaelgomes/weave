const { executeQuery } = require("@/database/connection");

/** Per-user per-project preferences (stored as JSONB). */
class UserViewPrefsRepository {
  /**
   * @param {string} projectId
   * @param {string} userId
   * @returns {Promise<'board'|'list'>}
   */
  async getUserView(projectId, userId) {
    const rows = await executeQuery(
      `SELECT prefs
       FROM user_project_prefs
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    if (!rows.length) return "board";
    const v = rows[0]?.prefs?.view;
    return v === "list" ? "list" : "board";
  }

  /**
   * @param {string} projectId
   * @param {string} userId
   * @param {'board'|'list'} view
   * @returns {Promise<'board'|'list'>}
   */
  async upsertUserView(projectId, userId, view) {
    const rows = await executeQuery(
      `INSERT INTO user_project_prefs (user_id, project_id, prefs, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, project_id)
       DO UPDATE SET prefs = user_project_prefs.prefs || EXCLUDED.prefs, updated_at = NOW()
       RETURNING prefs`,
      [userId, projectId, JSON.stringify({ view })]
    );
    const saved = rows[0]?.prefs?.view;
    return saved === "list" ? "list" : "board";
  }
}

module.exports = new UserViewPrefsRepository();
