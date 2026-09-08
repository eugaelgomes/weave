-- Allow accounts to be created without a display name during signup.
ALTER TABLE "users"
  ALTER COLUMN "name" DROP NOT NULL;
