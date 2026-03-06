-- Criar ENUM para roles de system admins
CREATE TYPE system_users_roles AS ENUM ('super_admin', 'manager', 'support', 'read_only');

-- Comentário explicativo
COMMENT ON TYPE system_users_roles IS 'Roles para administradores do sistema: super_admin (acesso total), manager (gerenciar users/orgs), support (leitura e atualização), read_only (apenas visualização)';
