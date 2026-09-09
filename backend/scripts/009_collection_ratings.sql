CREATE TABLE IF NOT EXISTS collection_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  citizen_id INT NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  feedback VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_citizen_request_rating (request_id, citizen_id),
  INDEX idx_collection_ratings_created (created_at),
  CONSTRAINT fk_rating_request FOREIGN KEY (request_id) REFERENCES collection_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_citizen FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
);
