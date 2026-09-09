CREATE TABLE IF NOT EXISTS route_bins (
  route_id INT NOT NULL,
  bin_id INT NOT NULL,
  route_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, bin_id),
  UNIQUE KEY unique_active_route_bin (bin_id),
  INDEX idx_route_bins_route_order (route_id, route_order),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (bin_id) REFERENCES garbage_bins(id) ON DELETE CASCADE
);