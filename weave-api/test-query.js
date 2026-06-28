require("module-alias/register");
const { pool } = require("./src/database/connection");

async function run() {
  try {
    const query = `
      SELECT
        r.id, r.reasoning_type, r.title, r.status, r.safety_label,
        r.safety_blocked, r.provider_used, r.model_used,
        r.action_items_count, r.processing_time_ms,
        r.recipient_scope, r.expires_at,
        r.created_at, r.updated_at,
        ri.is_read, ri.is_pinned, ri.is_dismissed, ri.feedback,
        ps.sprint_number, ps.title AS sprint_title,
        COUNT(*) OVER() AS total_count
      FROM weave_engine_reasonings r
      LEFT JOIN weave_engine_reasoning_interactions ri
        ON ri.reasoning_id = r.id
        AND ri.user_id = $2::uuid
      LEFT JOIN project_sprints ps
        ON ps.id = r.sprint_id
        AND ps.deleted = false
      WHERE r.project_id = $1::uuid
        AND r.deleted = false
        AND r.safety_blocked = false
        AND (
          r.recipient_scope = 'all_members'
          OR (r.recipient_scope = 'owner_only' AND r.triggered_by = $2::uuid)
          OR (r.recipient_scope = 'custom' AND r.custom_recipients @> to_jsonb($2::text))
        )
      ORDER BY r.created_at DESC
      LIMIT 10 OFFSET 0
    `;
    const params = [
      "b3507864-b8e6-4f28-ae36-9c249c20e793",
      "54e54c2c-7b00-4454-867e-1dda5dcd49a6",
    ];
    const res = await pool.query(query, params);
    console.log("Rows returned:", res.rows.length);
    if (res.rows.length === 0) {
      console.log("Checking project_members for this user:");
      const pmRes = await pool.query(
        `SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2`,
        params
      );
      console.log("Membership:", pmRes.rows);
      console.log("Checking if reasoning exists at all:");
      const rRes = await pool.query(
        `SELECT id, deleted, safety_blocked, recipient_scope, triggered_by FROM weave_engine_reasonings WHERE id = '8dd134b0-f22d-45fd-97d2-d0b6f2752dc8'`
      );
      console.log("Reasoning:", rRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
