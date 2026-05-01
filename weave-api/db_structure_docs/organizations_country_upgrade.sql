BEGIN;

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS country varchar(2) NULL;

ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_country_format_check;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_country_format_check
CHECK (
  country IS NULL
  OR country ~ '^[A-Z]{2}$'
);

COMMIT;
