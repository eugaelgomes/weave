const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { pool } = require("@/database/connection");

const PgSessionStore = connectPgSimple(session);

/**
 * Custom Weave Session Store that extends connect-pg-simple.
 * It intercepts the set() and touch() methods to extract custom fields 
 * (like user_id, ip_address, and user_agent) from the session payload 
 * and saves them directly into the customized 'sessions' table columns.
 */
class WeaveSessionStore extends PgSessionStore {
  constructor(options) {
    super({
      pool,
      tableName: "sessions",
      createTableIfMissing: false, // We manage creation via migration
      ...options,
    });
  }

  set(sid, sess, cb) {
    super.set(sid, sess, async (err) => {
      if (err) return cb && cb(err);
      
      try {
        const userId = sess?.user?.id || sess?.userId || null;
        const ipAddress = sess?.ip_address || null;
        const userAgent = sess?.user_agent || null;

        if (userId || ipAddress || userAgent) {
          const query = `
            UPDATE sessions 
            SET 
              user_id = COALESCE($1, user_id),
              ip_address = COALESCE($2, ip_address),
              user_agent = COALESCE($3, user_agent),
              last_active = NOW()
            WHERE sid = $4
          `;
          await pool.query(query, [userId, ipAddress, userAgent, sid]);
        }
        
        if (cb) cb();
      } catch (updateErr) {
        console.error("[WeaveSessionStore] Error updating session metadata:", updateErr);
        if (cb) cb(updateErr);
      }
    });
  }

  touch(sid, sess, cb) {
    super.touch(sid, sess, async (err) => {
      if (err) return cb && cb(err);
      
      try {
        // Touch updates last_active to track active sessions accurately
        const query = `
          UPDATE sessions 
          SET last_active = NOW()
          WHERE sid = $1
        `;
        await pool.query(query, [sid]);
        
        if (cb) cb();
      } catch (updateErr) {
        console.error("[WeaveSessionStore] Error touching session metadata:", updateErr);
        if (cb) cb(updateErr);
      }
    });
  }
}

module.exports = { WeaveSessionStore };
