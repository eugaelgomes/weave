-- Seed inicial para criar primeiro super admin
-- Execute este script após criar a tabela system_admins e o ENUM system_users_roles
-- Substitua os valores pelos dados do seu primeiro admin

INSERT INTO system_admins (
  email,
  name,
  role,
  user_function,
  is_active,
  is_suspended,
  is_deleted
) VALUES (
  'seu-email@exemplo.com',  -- Substitua pelo email do primeiro admin
  'Nome do Admin',           -- Substitua pelo nome do primeiro admin
  'super_admin',             -- Role inicial como super_admin
  'Administrador do Sistema', -- Função/cargo do admin
  true,                       -- Conta ativa
  false,                      -- Não suspensa
  false                       -- Não deletada
)
ON CONFLICT (email) DO NOTHING;

-- Verificar se foi criado
SELECT id, email, name, role, is_active 
FROM system_admins 
WHERE email = 'seu-email@exemplo.com';
