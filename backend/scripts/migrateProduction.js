/*
 * Creates the full EcoSmart production schema on a fresh MySQL database.
 * Every CREATE statement is idempotent, so Railway can run this before each deploy.
 */
const mysql = require("mysql2/promise");
require("dotenv").config();

const connectionOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: true
};

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('citizen','driver','admin') NOT NULL DEFAULT 'citizen',
    is_verified TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    avatar_url VARCHAR(500) NULL,
    google_id VARCHAR(100) NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email), INDEX idx_phone (phone), INDEX idx_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY, phone VARCHAR(15) NOT NULL, otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL, is_used TINYINT(1) DEFAULT 0, attempts INT DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_otp (phone, otp_code), INDEX idx_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL UNIQUE, vehicle_number VARCHAR(30),
    license_number VARCHAR(60), assigned_area VARCHAR(120),
    driver_status ENUM('Available','On Route','On Break','Completed','Offline') NOT NULL DEFAULT 'Available',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS garbage_bins (
    id INT AUTO_INCREMENT PRIMARY KEY, bin_code VARCHAR(30) NOT NULL UNIQUE, location VARCHAR(180) NOT NULL,
    latitude DECIMAL(10,7), longitude DECIMAL(10,7), capacity INT DEFAULT 120, current_level INT DEFAULT 0,
    bin_type VARCHAR(60) DEFAULT 'General Waste',
    status ENUM('Pending','In Progress','Completed','Skipped','Normal','Almost Full','Full') NOT NULL DEFAULT 'Pending',
    priority ENUM('Normal','High','Urgent') NOT NULL DEFAULT 'Normal', is_active TINYINT(1) NOT NULL DEFAULT 1,
    assigned_driver_id INT NULL, route_order INT DEFAULT 0, last_collection DATETIME NULL,
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS driver_locations (
    id INT AUTO_INCREMENT PRIMARY KEY, driver_id INT NOT NULL, latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL, recorded_at DATETIME NOT NULL,
    INDEX idx_driver_location (driver_id, recorded_at),
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS collection_history (
    id INT AUTO_INCREMENT PRIMARY KEY, driver_id INT NOT NULL, bin_id INT NOT NULL,
    waste_collected DECIMAL(8,2) DEFAULT 0, status ENUM('Completed','Skipped') NOT NULL,
    skip_reason VARCHAR(300) NULL, collected_at DATETIME NOT NULL,
    before_image_path VARCHAR(500) NULL, after_image_path VARCHAR(500) NULL,
    verification_status ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending', verification_note VARCHAR(500) NULL,
    INDEX idx_collection_driver (driver_id, collected_at), INDEX idx_collection_bin (bin_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id), FOREIGN KEY (bin_id) REFERENCES garbage_bins(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS collection_requests (
    id INT AUTO_INCREMENT PRIMARY KEY, bin_id INT NULL,
    status ENUM('Pending','Assigned','In Progress','Completed','Cancelled') DEFAULT 'Pending', citizen_id INT NULL,
    assigned_driver_id INT NULL, location VARCHAR(180) NULL, request_type VARCHAR(80) NULL,
    description TEXT NULL, scheduled_date DATE NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bin_id) REFERENCES garbage_bins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY, driver_id INT NULL, citizen_id INT NULL, category VARCHAR(60) NOT NULL,
    description TEXT NOT NULL, location VARCHAR(180) NOT NULL,
    priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium', image_path VARCHAR(500) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Open', created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, message VARCHAR(500) NOT NULL,
    type VARCHAR(30) DEFAULT 'info', is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_user (user_id, is_read), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY, route_name VARCHAR(120) NOT NULL, driver_id INT NULL, area VARCHAR(120),
    status ENUM('Active','Inactive','Completed') NOT NULL DEFAULT 'Active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(80) PRIMARY KEY, setting_value VARCHAR(500) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS route_bins (
    route_id INT NOT NULL, bin_id INT NOT NULL, route_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (route_id, bin_id), UNIQUE KEY unique_active_route_bin (bin_id),
    INDEX idx_route_bins_route_order (route_id, route_order),
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
    FOREIGN KEY (bin_id) REFERENCES garbage_bins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, module_name VARCHAR(30) NOT NULL,
    action VARCHAR(150) NOT NULL, method VARCHAR(10) NOT NULL, resource VARCHAR(255) NOT NULL,
    status_code SMALLINT NOT NULL, created_at DATETIME NOT NULL, INDEX idx_audit_user (user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL, status ENUM('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
    created_at DATETIME NOT NULL, INDEX idx_support_user (user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS fuel_logs (
    id INT AUTO_INCREMENT PRIMARY KEY, driver_id INT NOT NULL, fuel_litres DECIMAL(10,2) NOT NULL,
    fuel_cost DECIMAL(12,2) NULL, odometer_km DECIMAL(12,2) NOT NULL, note VARCHAR(300) NULL,
    logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_fuel_logs_driver_date (driver_id, logged_at),
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS collection_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY, request_id INT NOT NULL, citizen_id INT NOT NULL, rating TINYINT UNSIGNED NOT NULL,
    feedback VARCHAR(1000) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_citizen_request_rating (request_id, citizen_id), INDEX idx_collection_ratings_created (created_at),
    FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL, is_used TINYINT(1) DEFAULT 0, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reset_user (user_id), INDEX idx_token_hash (token_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL, user_agent TEXT NULL, expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_user_sessions (user_id), INDEX idx_token (token_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS waste_scans (
    id INT AUTO_INCREMENT PRIMARY KEY, citizen_id INT NOT NULL, image_path VARCHAR(500) NOT NULL,
    category ENUM('wet','dry','plastic','electronic','hazardous') NOT NULL, confidence TINYINT UNSIGNED NOT NULL DEFAULT 0,
    explanation TEXT NULL, disposal_guidance TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_waste_scans_citizen (citizen_id, created_at),
    FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

async function migrate() {
  if (!connectionOptions.host || !connectionOptions.user || !connectionOptions.database) {
    throw new Error("Database environment variables are required before migration.");
  }
  const connection = await mysql.createConnection(connectionOptions);
  try {
    for (const statement of schema) await connection.query(statement);
    await connection.query(`INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
      ('system_name', 'EcoSmart Ballari'), ('city', 'Ballari, Karnataka'),
      ('map_default_zoom', '14'), ('notifications_enabled', 'true')`);
    console.log("EcoSmart production schema is ready.");
  } finally {
    await connection.end();
  }
}

migrate().catch(error => {
  console.error("Production migration failed:", error.message);
  process.exitCode = 1;
});
