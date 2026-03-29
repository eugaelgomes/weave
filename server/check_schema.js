const { pool } = require('./src/database/connection');
async function check() {
  const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'task_priorities'");
  console.log(result.rows);
  process.exit(0);
}
check();
