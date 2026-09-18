-- SENQUARA ONE
-- STEP 1 — Master Registration Users Table

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,
    business_name TEXT DEFAULT '',

    email TEXT NOT NULL UNIQUE,
    mobile TEXT NOT NULL,
    country TEXT DEFAULT '',

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'pending',

    email_verified INTEGER NOT NULL DEFAULT 0,

    terms_version TEXT DEFAULT '',
    terms_accepted_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);
