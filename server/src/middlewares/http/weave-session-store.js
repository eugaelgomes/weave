const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { pool } = require("@/database/connection");

const PgSessionStore = connectPgSimple(session);

/**
 * Whether the sessions table has the extended metadata columns.
 * Detected lazily on first write and cached for the process lifetime.
 * This prevents crashes when the migration hasn't been run in production yet.
 * @type {boolean | null}
 */
let _hasMetadataColumns = null;

/**
 * Checks (once) whether the metadata columns exist in the sessions table.
 * @returns {Promise<boolean>}
 */
async function hasMetadataColumns() {
  if (_hasMetadataColumns !== null) return _hasMetadataColumns;

  try {
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sessions'
        AND column_name = 'user_id'
    `);
    _hasMetadataColumns = rows.length > 0;
  } catch {
    _hasMetadataColumns = false;
  }

  if (!_hasMetadataColumns) {
    console.warn(
      "[WeaveSessionStore] Metadata columns not found in 'sessions' table. " +
        "Run the add_session_metadata migration to enable session tracking."
    );
  }

  return _hasMetadataColumns;
}

/**
 * Custom Weave Session Store that extends connect-pg-simple.
 * It intercepts the set() and touch() methods to extract custom fields
 * (like user_id, ip_address, and user_agent) from the session payload
 * and saves them directly into the customized 'sessions' table columns.
 *
 * Metadata update errors are NEVER propagated to the callback — the session
 * is already persisted by super.set() at that point. Losing tracking data
 * is acceptable; breaking the sign-in flow is not.
 */
class WeaveSessionStore extends PgSessionStore {
  constructor(options) {
    super({
      createTableIfMissing: false,
      pool,
      tableName: "sessions", // We manage creation via migration
      ...options,
    });
  }

  set(sid, sess, cb) {
    super.set(sid, sess, async (err) => {
      // If the core session write failed, propagate immediately.
      if (err) return cb && cb(err);

      // Metadata update is best-effort: never fail the session save.
      try {
        const columnsExist = await hasMetadataColumns();
        if (!columnsExist) return cb && cb();

        const userId = sess?.user?.id || sess?.userId || null;
        const ipAddress = sess?.ip_address || null;
        const userAgent = sess?.user_agent || null;
        const apiType = sess?.api_type || null;

        if (userId || ipAddress || userAgent || apiType) {
          const query = `
            UPDATE sessions
            SET
              user_id    = COALESCE($1, user_id),
              ip_address = COALESCE($2, ip_address),
              user_agent = COALESCE($3, user_agent),
              api_type   = COALESCE($4, api_type),
              last_active = NOW()
            WHERE sid = $5
          `;
          await pool.query(query, [userId, ipAddress, userAgent, apiType, sid]);
        }
      } catch (updateErr) {
        // Log for observability but do NOT propagate — the session is already saved.
        console.error(
          "[WeaveSessionStore] Non-fatal error updating session metadata:",
          updateErr.message
        );
      }

      if (cb) cb();
    });
  }

  touch(sid, sess, cb) {
    super.touch(sid, sess, async (err) => {
      // If the core touch failed, propagate immediately.
      if (err) return cb && cb(err);

      // Metadata touch is best-effort: never fail the session renewal.
      try {
        const columnsExist = await hasMetadataColumns();
        if (!columnsExist) return cb && cb();

        const query = `
          UPDATE sessions
          SET last_active = NOW()
          WHERE sid = $1
        `;
        await pool.query(query, [sid]);
      } catch (updateErr) {
        console.error(
          "[WeaveSessionStore] Non-fatal error touching session metadata:",
          updateErr.message
        );
      }

      if (cb) cb();
    });
  }
}

module.exports = { WeaveSessionStore };
