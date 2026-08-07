const fs = require('fs');
const path = require('path');
const { pool } = require('../src/database/connection');

async function run() {
  try {
    const sqlPath = '/home/gaelgomes/.gemini/antigravity/brain/ab056b93-10fc-4fb9-be6d-722e47fa43c2/scratch/agent_house_migration.sql';
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
