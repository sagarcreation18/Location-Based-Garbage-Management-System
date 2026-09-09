const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "..", "migrations", "007_route_bin_assignments.sql"), "utf8");
    for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await pool.query(statement);
    console.log("Route-bin migration completed.");
  } catch (error) {
    console.error("Route-bin migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();