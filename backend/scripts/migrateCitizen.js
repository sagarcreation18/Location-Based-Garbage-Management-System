const mysql = require("mysql2/promise");
require("dotenv").config();
const columns = {
  collection_requests: [
    ["citizen_id", "INT NULL"], ["assigned_driver_id", "INT NULL"], ["location", "VARCHAR(180) NULL"], ["request_type", "VARCHAR(80) NULL"],
    ["description", "TEXT NULL"], ["scheduled_date", "DATE NULL"], ["created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"]
  ],
  complaints: [["citizen_id", "INT NULL"], ["priority", "ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium'"]]
};
(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    for (const [table, fields] of Object.entries(columns)) {
      const [existing] = await db.query(`DESCRIBE ${table}`); const names = new Set(existing.map(x => x.Field));
      for (const [name, definition] of fields) if (!names.has(name)) await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
    console.log("Citizen migration applied");
  } finally { await db.end(); }
})().catch(err => { console.error("Citizen migration failed:", err.message); process.exitCode = 1; });
