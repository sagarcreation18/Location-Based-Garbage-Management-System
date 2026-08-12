CREATE DATABASE IF NOT EXISTS ecotech_smart_city;

USE ecotech_smart_city;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Citizen', 'Driver', 'Admin') NOT NULL DEFAULT 'Citizen',
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo Admin account
-- Password: Admin@123
INSERT INTO users
(full_name, email, phone, password, role)
VALUES
(
    'System Administrator',
    'admin@ecotech.com',
    '9999999999',
    '$2b$10$YourHashedPasswordWillBeGeneratedLater',
    'Admin'
);