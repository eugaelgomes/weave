-- Enables session inventory, remote revocation and server-side auditing.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS api_type TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS sessions_user_id_expire_idx ON sessions (user_id, expire);
