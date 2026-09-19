-- SENQUARA ONE auth upgrade v2
-- Run once against the existing D1 database.
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN google_email TEXT;
ALTER TABLE user_presence ADD COLUMN user_agent TEXT;
