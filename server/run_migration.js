const fs = require('fs');
const { Pool } = require('./node_modules/@types/pg');

async function run() {
  const pool = new Pool({
    connectionString: "postgresql://avnadmin:AVNS_IUl04oNUReH_eMlayGQ@cw-notes-db-codaweb.f.aivencloud.com:17295/weave-notes",
    ssl: { rejectUnauthorized: false }
  });
  
  const sql = fs.readFileSync('/home/gaelgomes/projetos/theweave/weave-api/scripts/migrations/tracing_tables_migration.sql', 'utf8');
  
  console.log("Running migration...");
  await pool.query(sql);
  console.log("Migration successful!");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
