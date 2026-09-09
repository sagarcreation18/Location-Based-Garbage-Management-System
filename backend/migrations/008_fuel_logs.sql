CREATE TABLE IF NOT EXISTS fuel_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  fuel_litres DECIMAL(10,2) NOT NULL,
  fuel_cost DECIMAL(12,2) NULL,
  odometer_km DECIMAL(12,2) NOT NULL,
  note VARCHAR(300) NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fuel_logs_driver_date (driver_id, logged_at),
  CONSTRAINT fk_fuel_logs_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);
