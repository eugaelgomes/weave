const fs = require('fs');
const path = require('path');
const { pool } = require('../src/database/connection');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'llm_models_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Running SQL migration...");
    await pool.query(sql);
    console.log("Migration executed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    pool.end();
  }
}

run();
