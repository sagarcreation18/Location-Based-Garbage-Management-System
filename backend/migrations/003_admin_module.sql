-- Admin-management additions; all statements preserve existing data.
CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_name VARCHAR(120) NOT NULL,
  driver_id INT NULL,
  area VARCHAR(120),
  status ENUM('Active','Inactive','Completed') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('system_name', 'EcoSmart Ballari'),
  ('city', 'Ballari, Karnataka'),
  ('map_default_zoom', '14'),
  ('notifications_enabled', 'true');
