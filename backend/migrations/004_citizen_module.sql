-- Run once against the DB_NAME database. Adds Citizen ownership and details to existing records.
ALTER TABLE collection_requests ADD COLUMN citizen_id INT NULL;
ALTER TABLE collection_requests ADD COLUMN assigned_driver_id INT NULL;
ALTER TABLE collection_requests ADD COLUMN location VARCHAR(180) NULL;
ALTER TABLE collection_requests ADD COLUMN request_type VARCHAR(80) NULL;
ALTER TABLE collection_requests ADD COLUMN description TEXT NULL;
ALTER TABLE collection_requests ADD COLUMN scheduled_date DATE NULL;
ALTER TABLE collection_requests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE complaints ADD COLUMN citizen_id INT NULL;
ALTER TABLE complaints ADD COLUMN priority ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium';
