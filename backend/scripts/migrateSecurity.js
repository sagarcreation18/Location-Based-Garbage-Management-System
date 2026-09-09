const mysql = require("mysql2/promise");
require("dotenv").config();
(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, multipleStatements: true });
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS audit_logs (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id INT NULL,module_name VARCHAR(30) NOT NULL,action VARCHAR(150) NOT NULL,method VARCHAR(10) NOT NULL,resource VARCHAR(255) NOT NULL,status_code SMALLINT NOT NULL,created_at DATETIME NOT NULL,INDEX(user_id, created_at))`);
    const [columns] = await db.query("DESCRIBE complaints");
    if (!columns.some(column => column.Field === "image_path")) await db.query("ALTER TABLE complaints ADD COLUMN image_path VARCHAR(500) NULL");
    console.log("Security and upload migration applied");
  } finally { await db.end(); }
})().catch(error => { console.error("Security migration failed:", error.message); process.exitCode = 1; });
