const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "..", "migrations", "008_fuel_logs.sql"), "utf8");
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(value => value.trim()).filter(Boolean)) await pool.query(statement);
    console.log("Fuel logs migration completed.");
  } catch (error) {
    console.error("Fuel logs migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
