CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  module_name VARCHAR(30) NOT NULL,
  action VARCHAR(150) NOT NULL,
  method VARCHAR(10) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  status_code SMALLINT NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id, created_at)
);

ALTER TABLE complaints ADD COLUMN image_path VARCHAR(500) NULL;
