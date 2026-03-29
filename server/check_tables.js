const { pool } = require('./src/database/connection');
async function check() {
  const result1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tags'");
  console.log('tags:', result1.rows);
  const result2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'project_stages'");
  console.log('project_stages:', result2.rows);
  process.exit(0);
}
check();
