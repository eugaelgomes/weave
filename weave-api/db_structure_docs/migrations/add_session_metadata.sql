-- Migration: Add metadata to sessions table

-- First, ensure the table exists (in case it wasn't created yet by connect-pg-simple)
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);

-- Add new metadata columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("user_id") ON DELETE CASCADE;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ip_address" varchar(45);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT NOW();
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "last_active" timestamp DEFAULT NOW();
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "api_type" varchar(20);

-- Create indices for quick lookups and cleanup
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_last_active" ON "sessions" ("last_active");
CREATE INDEX IF NOT EXISTS "idx_sessions_expire" ON "sessions" ("expire");
