-- Add foreign key constraint to link ai_chat_messages.organization_id with organizations.id

BEGIN;

ALTER TABLE public.ai_chat_messages
  ADD CONSTRAINT "ai_chat_messages_organization_FK"
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;

COMMIT;
