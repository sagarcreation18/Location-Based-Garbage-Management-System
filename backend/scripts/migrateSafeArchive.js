const pool = require("../config/db");

(async () => {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM garbage_bins LIKE 'is_active'");
    if (!columns.length) {
      await pool.query("ALTER TABLE garbage_bins ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status");
      console.log("Added garbage_bins.is_active for safe archive support.");
    } else console.log("Safe archive column already exists.");
  } catch (error) {
    console.error("Archive migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
