/* Applies the Driver migration and creates an idempotent local demo account. */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, multipleStatements: true
    });
    try {
        const migration = fs.readFileSync(path.join(__dirname, "..", "migrations", "002_driver_module.sql"), "utf8");
        await connection.query(migration);
        const password = await bcrypt.hash("Driver@123", 10);
        await connection.execute(
            `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_active)
             VALUES (?, ?, ?, ?, 'driver', TRUE, TRUE)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), password_hash = VALUES(password_hash), role = 'driver', is_verified = TRUE, is_active = TRUE`,
            ["Ramesh Kumar", "ramesh.driver@ecotech.com", "9876543210", password]
        );
        const [users] = await connection.execute("SELECT id FROM users WHERE email = ?", ["ramesh.driver@ecotech.com"]);
        await connection.execute(
            `INSERT INTO drivers (user_id, vehicle_number, license_number, assigned_area, driver_status)
             VALUES (?, ?, ?, ?, 'Available')
             ON DUPLICATE KEY UPDATE vehicle_number = VALUES(vehicle_number), license_number = VALUES(license_number), assigned_area = VALUES(assigned_area)`,
            [users[0].id, "KA-34-AB-1234", "KA34-2026-DEMO", "Gandhi Nagar"]
        );
        console.log("Demo Driver ready: ramesh.driver@ecotech.com / Driver@123");
    } finally { await connection.end(); }
}
seed().catch(error => { console.error("Driver setup failed:", error.message); process.exitCode = 1; });
