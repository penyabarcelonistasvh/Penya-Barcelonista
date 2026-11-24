-- Migració additiva: no modifica les taules ni els comptes existents.
CREATE TABLE IF NOT EXISTS admin_credentials (
 user_id TEXT PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
 username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL,
 password_salt TEXT NOT NULL,
 password_iterations INTEGER NOT NULL CHECK(password_iterations >= 100000),
 must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_login_limits (
 bucket TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 0,
 window_started INTEGER NOT NULL,
 blocked_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_admin_login_limits_window ON admin_login_limits(window_started);
