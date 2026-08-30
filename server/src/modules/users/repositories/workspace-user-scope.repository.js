const { executeQuery } = require("@/database/connection");

/**
 * Workspace isolation: active membership is any `workspace_members` row with
 * `deleted = false` and `status = ACTIVE` (any `area_id`).
 */
class WorkspaceUserScopeRepository {
  /**
   * @param {string} userId
   * @returns {Promise<string[]>} Distinct workspace UUIDs as strings.
   */
  async getActiveWorkspaceIdsForUser(userId) {
    const query = `
      SELECT DISTINCT workspace_id::text
      FROM workspace_members
      WHERE user_id = $1::uuid
        AND deleted = false
        AND status = 'ACTIVE'::public.workspace_member_status_enum
    `;
    const rows = await executeQuery(query, [userId]);
    return rows.map((r) => r.workspace_id);
  }

  /**
   * Whether two users may discover or share with each other:
   * - both outside any workspace (no active workspace membership), or
   * - both inside at least one workspace and share an workspace.
   *
   * @param {string} actorUserId
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async usersMayInteract(actorUserId, targetUserId) {
    const query = `
      WITH actor_workspaces AS (
        SELECT DISTINCT workspace_id
        FROM workspace_members
        WHERE user_id = $1::uuid
          AND deleted = false
          AND status = 'ACTIVE'::public.workspace_member_status_enum
      ),
      target_workspaces AS (
        SELECT DISTINCT workspace_id
        FROM workspace_members
        WHERE user_id = $2::uuid
          AND deleted = false
          AND status = 'ACTIVE'::public.workspace_member_status_enum
      ),
      actor_count AS (SELECT COUNT(*)::int AS c FROM actor_workspaces),
      target_count AS (SELECT COUNT(*)::int AS c FROM target_workspaces)
      SELECT
        (SELECT c FROM actor_count) AS actor_workspace_count,
        (SELECT c FROM target_count) AS target_workspace_count,
        EXISTS (
          SELECT 1
          FROM actor_workspaces a
          INNER JOIN target_workspaces t ON a.workspace_id = t.workspace_id
        ) AS intersects
    `;
    const rows = await executeQuery(query, [actorUserId, targetUserId]);
    const row = rows[0];
    if (!row) return false;

    const actorN = Number(row.actor_workspace_count) || 0;
    const targetN = Number(row.target_workspace_count) || 0;

    if (actorN === 0 && targetN === 0) return true;
    if (actorN === 0 || targetN === 0) return false;
    return Boolean(row.intersects);
  }
}

module.exports = new WorkspaceUserScopeRepository();
