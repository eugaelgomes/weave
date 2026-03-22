# Sistema de Administração - Weave Notes

## Visão Geral

Sistema completo de administração separado para gerenciar usuários e organizações da plataforma Weave Notes.

## Arquitetura

### Módulos Implementados

1. **system-auth** - Autenticação de administradores
2. **system-admins** - CRUD de administradores do sistema
3. **admin** - Gerenciamento de usuários e organizações (atualizado)

### Roles e Permissões

| Role          | Permissões                                                    |
| ------------- | ------------------------------------------------------------- |
| `super_admin` | Acesso total: CRUD de admins, gerenciar users/orgs, deletar   |
| `manager`     | Gerenciar users/orgs (atualizar, deletar), sem CRUD de admins |
| `support`     | Atualizar users/orgs, visualizar tudo, sem deletar            |
| `read_only`   | Apenas visualização (dashboard, listas, detalhes)             |

### Endpoints

#### Autenticação de System Admin

**Base:** `/api/v1/system-auth`

- `POST /login` - Login de admin (sem autenticação)
- `POST /logout` - Logout de admin
- `GET /profile` - Perfil do admin logado (requer auth)

#### CRUD de System Admins

**Base:** `/api/v1/system-admins` (requer autenticação)

- `GET /` - Listar admins (todos os roles)
- `GET /stats` - Estatísticas de admins (todos os roles)
- `GET /:id` - Detalhes de um admin (todos os roles)
- `POST /` - Criar admin (**apenas super_admin**)
- `PUT /:id` - Atualizar admin (**manager, super_admin**)
- `POST /:id/suspend` - Suspender admin (**manager, super_admin**)
- `POST /:id/activate` - Ativar admin (**manager, super_admin**)
- `DELETE /:id` - Deletar admin (**apenas super_admin**)
- `POST /:id/restore` - Restaurar admin (**apenas super_admin**)

#### Gerenciamento de Usuários/Organizações

**Base:** `/api/v1/admin` (requer autenticação)

**Dashboard:**

- `GET /dashboard` - Estatísticas gerais (todos os roles)

**Usuários:**

- `GET /users` - Listar usuários (todos os roles)
- `GET /users/:id` - Detalhes do usuário (todos os roles)
- `PUT /users/:id` - Atualizar usuário (**support, manager, super_admin**)
- `DELETE /users/:id` - Deletar usuário (**manager, super_admin**)
- `POST /users/:id/restore` - Restaurar usuário (**manager, super_admin**)

**Organizações:**

- `GET /organizations` - Listar organizações (todos os roles)
- `GET /organizations/:id` - Detalhes da organização (todos os roles)
- `PUT /organizations/:id` - Atualizar organização (**support, manager, super_admin**)
- `DELETE /organizations/:id` - Deletar organização (**manager, super_admin**)
- `POST /organizations/:id/restore` - Restaurar organização (**manager, super_admin**)

**Planos:**

- `GET /plans` - Listar planos (todos os roles)

## Setup

### 1. Criar ENUM no Banco de Dados

Execute o script SQL:

```bash
psql -h <host> -U <user> -d <database> -f server/db_docs/create_system_users_roles_enum.sql
```

### 2. Criar Primeiro Admin

Edite e execute o seed:

```bash
# Editar o arquivo com seus dados
nano server/db_docs/seed_first_admin.sql

# Executar seed
psql -h <host> -U <user> -d <database> -f server/db_docs/seed_first_admin.sql
```

### 3. Variáveis de Ambiente

Certifique-se de ter `SECRET_KEY` configurada no `.env`:

```env
SECRET_KEY=sua-chave-secreta-jwt
```

## Autenticação

### JWT Separado

O sistema usa JWT separado para admins com:

- Cookie: `system_admin_token`
- Header: `Authorization: Bearer <token>`
- Claim especial: `isSystemAdmin: true`
- Expiração: 8 horas

### Fluxo de Autenticação

1. Admin faz login em `/api/v1/system-auth/login` com email
2. Sistema valida status (`is_active`, `is_suspended`, `is_deleted`)
3. JWT é gerado com role do admin
4. Token armazenado em cookie HttpOnly
5. Middleware valida token em cada requisição

## Segurança

### Proteções Implementadas

1. **Auto-proteção:** Admins não podem deletar, suspender ou alterar role de si mesmos
2. **Validação de status:** Contas inativas/suspensas não podem fazer login
3. **Soft delete:** Admins deletados podem ser restaurados
4. **Controle granular:** Cada endpoint verifica permissões específicas
5. **JWT separado:** Evita conflito com tokens de usuários regulares

### Middleware Hierarchy

```
requireSystemAdmin (base - valida JWT e status)
  ├── requireSuperAdmin (super_admin)
  ├── requireManager (super_admin, manager)
  └── requireSupport (super_admin, manager, support)
```

## Notas Importantes

⚠️ **Autenticação de Admin:** Atualmente o sistema **NÃO valida senha** pois a tabela `system_admins` não possui campo `password`. Considere:

- Adicionar campo `password_hash` na tabela
- Ou usar autenticação OAuth/SSO externa
- Ou gerar tokens de acesso temporários

⚠️ **Primeiro Admin:** Deve ser criado manualmente via SQL. Após isso, apenas `super_admin` pode criar novos admins.

⚠️ **Migração:** O arquivo `admin.middleware.js` antigo (com `ADMIN_EMAILS`) não é mais usado e pode ser removido.

## Teste de API

### Login

```bash
curl -X POST http://localhost:8080/api/v1/system-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exemplo.com",
    "password": "temp"
  }'
```

### Listar Admins

```bash
curl http://localhost:8080/api/v1/system-admins \
  -H "Authorization: Bearer <token>"
```

### Dashboard

```bash
curl http://localhost:8080/api/v1/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

## TODO

- [ ] Adicionar campo `password_hash` na tabela `system_admins`
- [ ] Implementar hash de senha no login
- [ ] Adicionar logs de auditoria para ações de admins
- [ ] Implementar rate limiting para login de admins
- [ ] Criar endpoint de recuperação de senha para admins
- [ ] Adicionar 2FA (Two-Factor Authentication)
