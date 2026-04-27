ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_with_microsoft boolean NOT NULL DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS microsoft_id varchar(255) UNIQUE;
