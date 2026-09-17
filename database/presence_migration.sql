-- SENQUARA ONE: Live Users / Presence / Block upgrade
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS user_presence(
  user_id TEXT PRIMARY KEY,
  ip TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  timezone TEXT,
  colo TEXT,
  presence_status TEXT NOT NULL DEFAULT 'online',
  last_error TEXT,
  last_seen TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(presence_status);

-- SQLite cannot add the same column twice. Run these only if your users table
-- does not already contain them:
-- ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN blocked_at TEXT;
