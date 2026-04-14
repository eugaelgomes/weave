-- Convites: área opcional e papéis alinhados a organizations_members (user_role).
-- Tabela: organization_invites_members (substitui invite_org_members em instalações antigas).
-- Executar manualmente no PostgreSQL se ainda não existirem as colunas/constraints.

ALTER TABLE organization_invites_members DROP CONSTRAINT IF EXISTS check_valid_role;

UPDATE organization_invites_members
SET role = 'member'
WHERE role::text IN ('owner', 'viewer');

ALTER TABLE organization_invites_members
  ADD CONSTRAINT organization_invites_members_role_check
  CHECK (
    (role)::text = ANY (
      (ARRAY['super_admin', 'admin', 'member', 'guest'])::text[]
    )
  );

ALTER TABLE organization_invites_members
  ADD COLUMN IF NOT EXISTS area_id uuid NULL;

ALTER TABLE organization_invites_members
  ADD COLUMN IF NOT EXISTS area_member_role varchar(50) NULL;

ALTER TABLE organization_invites_members
  DROP CONSTRAINT IF EXISTS fk_invite_org_area;

ALTER TABLE organization_invites_members
  ADD CONSTRAINT fk_org_invites_area
  FOREIGN KEY (area_id) REFERENCES organizations_areas (id) ON DELETE SET NULL;

COMMENT ON COLUMN organization_invites_members.area_id IS 'Área à qual o membro será associado ao aceitar o convite';
COMMENT ON COLUMN organization_invites_members.area_member_role IS 'Papel na área (manager, editor, viewer)';
