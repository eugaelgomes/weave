const { executeQuery } = require("@/database/connection");

/**
 * Workspace isolation: active membership is any `organization_members` row with
 * `deleted = false` and `status = ACTIVE` (any `area_id`).
 */
class WorkspaceUserScopeRepository {
  /**
   * @param {string} userId
   * @returns {Promise<string[]>} Distinct workspace UUIDs as strings.
   */
  async getActiveOrganizationIdsForUser(userId) {
    const query = `
      SELECT DISTINCT organization_id::text
      FROM organization_members
      WHERE user_id = $1::uuid
        AND deleted = false
        AND status = 'ACTIVE'::public.organization_member_status_enum
    `;
    const rows = await executeQuery(query, [userId]);
    return rows.map((r) => r.organization_id);
  }

  /**
   * Whether two users may discover or share with each other:
   * - both outside any workspace (no active org membership), or
   * - both inside at least one workspace and share an workspace.
   *
   * @param {string} actorUserId
   * @param {string} targetUserId
   * @returns {Promise<boolean>}
   */
  async usersMayInteract(actorUserId, targetUserId) {
    const query = `
      WITH actor_orgs AS (
        SELECT DISTINCT organization_id
        FROM organization_members
        WHERE user_id = $1::uuid
          AND deleted = false
          AND status = 'ACTIVE'::public.organization_member_status_enum
      ),
      target_orgs AS (
        SELECT DISTINCT organization_id
        FROM organization_members
        WHERE user_id = $2::uuid
          AND deleted = false
          AND status = 'ACTIVE'::public.organization_member_status_enum
      ),
      actor_count AS (SELECT COUNT(*)::int AS c FROM actor_orgs),
      target_count AS (SELECT COUNT(*)::int AS c FROM target_orgs)
      SELECT
        (SELECT c FROM actor_count) AS actor_org_count,
        (SELECT c FROM target_count) AS target_org_count,
        EXISTS (
          SELECT 1
          FROM actor_orgs a
          INNER JOIN target_orgs t ON a.organization_id = t.organization_id
        ) AS intersects
    `;
    const rows = await executeQuery(query, [actorUserId, targetUserId]);
    const row = rows[0];
    if (!row) return false;

    const actorN = Number(row.actor_org_count) || 0;
    const targetN = Number(row.target_org_count) || 0;

    if (actorN === 0 && targetN === 0) return true;
    if (actorN === 0 || targetN === 0) return false;
    return Boolean(row.intersects);
  }
}

module.exports = new WorkspaceUserScopeRepository();
