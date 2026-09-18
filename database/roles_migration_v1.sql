-- SENQUARA ONE — Master Admin / Admin / Staff role migration
-- Run once against the existing D1 database.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
-- If the statement above reports "duplicate column name", continue; the column already exists.
ALTER TABLE users ADD COLUMN updated_at TEXT;
-- If the statement above reports "duplicate column name", continue; the column already exists.

UPDATE users SET role='master_admin' WHERE role='owner';
UPDATE users SET role='admin' WHERE role IN ('manager','accountant');
UPDATE users SET role='staff' WHERE role IN ('billing','inventory','sales','viewer');

INSERT OR IGNORE INTO roles(id,name,permissions) VALUES
('master_admin','Master Admin','["view","create","edit","delete","approve","export","manage_users","manage_roles","block_users","settings","backup"]'),
('admin','Admin','["view","create","edit","delete","export"]'),
('staff','Staff','["view","create","edit"]');

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
