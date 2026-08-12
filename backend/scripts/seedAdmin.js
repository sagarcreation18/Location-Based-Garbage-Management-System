/* Creates or refreshes the local Admin demo account without exposing database credentials. */
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config();
(async () => {
    const connection = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
    try {
        const hash = await bcrypt.hash("Admin@123", 10);
        await connection.execute(
            `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_active)
             VALUES (?, ?, ?, ?, 'admin', TRUE, TRUE)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), password_hash = VALUES(password_hash), role = 'admin', is_verified = TRUE, is_active = TRUE`,
            ["System Administrator", "admin@ecotech.com", "9999999999", hash]
        );
        console.log("Demo Admin ready: admin@ecotech.com / Admin@123");
    } finally { await connection.end(); }
})().catch(error => { console.error("Admin setup failed:", error.message); process.exitCode = 1; });
