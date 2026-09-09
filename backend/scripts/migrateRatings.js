const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "009_collection_ratings.sql"), "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean);

  try {
    for (const statement of statements) await pool.query(statement);
    console.log("Collection ratings migration completed.");
  } catch (error) {
    console.error("Collection ratings migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
