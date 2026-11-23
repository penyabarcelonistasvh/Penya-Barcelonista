-- Esquema preparatori. NO executar sense configurar primer D1 i la migració.
CREATE TABLE IF NOT EXISTS admin_users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor')),
 active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 session_version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_permissions (
 user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
 permission TEXT NOT NULL CHECK (permission IN ('news','matches','notifications','teams','sponsors','club','users')),
 PRIMARY KEY(user_id,permission)
);
CREATE TABLE IF NOT EXISTS admin_audit (
 id TEXT PRIMARY KEY,
 actor_user_id TEXT,
 actor_email TEXT NOT NULL,
 action TEXT NOT NULL,
 target TEXT,
 result TEXT NOT NULL CHECK(result IN ('success','denied','error')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit(actor_user_id,created_at DESC);
