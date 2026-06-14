const { pool } = require("./src/database/connection");
async function test() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'ai_chat_messages'::regclass;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}
test();
