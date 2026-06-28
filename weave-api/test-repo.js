require("module-alias/register");
const repo = require("./src/modules/engine/repositories/reasonings.repository");
const { pool } = require("./src/database/connection");

async function run() {
  try {
    const projectId = "10eb6a05-afb0-4822-aa76-52e9553df202"; // From user request
    const userId = "00000000-0000-0000-0000-000000000000"; // Dummy valid UUID
    const filters = {};
    const pagination = { limit: 6, offset: 0 };
    const sort = { field: "created_at", order: "desc" };

    const res = await repo.listByProjectForMember(projectId, userId, filters, pagination, sort);
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    pool.end();
  }
}

run();
