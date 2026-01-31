# Migração: Colaboradores de Projetos para Tabela Separada

## Visão Geral

Esta migração move o sistema de colaboradores de projetos de um campo JSONB na tabela `projects` para uma tabela relacional dedicada `projects_members`.

## Estrutura da Nova Tabela

```sql
-- Criar tipo enum para roles (OPCIONAL - ou usar text com CHECK constraint)
-- Opção 1: Usar ENUM
CREATE TYPE user_role AS ENUM ('admin', 'viewer');

-- Opção 2: Usar TEXT com constraint (recomendado para mais flexibilidade)
-- role text NOT NULL CHECK (role IN ('admin', 'viewer'))

-- Criar tabela projects_members
CREATE TABLE IF NOT EXISTS public.projects_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'viewer')),
  deleted boolean NOT NULL DEFAULT false,
  suspended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by uuid NOT NULL,
  CONSTRAINT projects_members_pkey PRIMARY KEY (id),
  CONSTRAINT projects_members_project_id_fkey FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT projects_members_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT projects_members_added_by_fkey FOREIGN KEY (added_by)
    REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Criar índices
CREATE INDEX idx_projects_members_project_id ON projects_members(project_id);
CREATE INDEX idx_projects_members_user_id ON projects_members(user_id);
CREATE INDEX idx_projects_members_active ON projects_members(project_id, user_id)
  WHERE deleted = false AND suspended = false;
```

## Script de Migração de Dados

```sql
-- Migrar colaboradores existentes do JSONB para a tabela
WITH projects_with_collabs AS (
  SELECT
    id as project_id,
    user_id as owner_id,
    collaborators
  FROM projects
  WHERE collaborators IS NOT NULL
    AND jsonb_array_length(collaborators) > 0
),
expanded_collabs AS (
  SELECT
    pwc.project_id,
    pwc.owner_id,
    (collab->>'user_id')::uuid as collaborator_id,
    CASE
      WHEN collab->>'permission' = 'admin' THEN 'admin'::text
      ELSE 'viewer'::text
    END as role,
    (collab->>'removed')::boolean as removed,
    (collab->>'added_at')::timestamp with time zone as added_at
  FROM projects_with_collabs pwc,
  jsonb_array_elements(pwc.collaborators) as collab
  WHERE collab->>'user_id' IS NOT NULL
)
INSERT INTO projects_members (project_id, user_id, role, deleted, created_at, added_by)
SELECT
  project_id,
  collaborator_id,
  role,
  COALESCE(removed, false),
  COALESCE(added_at, now()),
  owner_id
FROM expanded_collabs
ON CONFLICT (project_id, user_id) DO NOTHING;
```

## Remover Campo JSONB (Opcional - Após Validação)

⚠️ **ATENÇÃO**: Apenas execute após validar que a migração funcionou corretamente!

```sql
-- Backup da coluna antes de remover
ALTER TABLE projects RENAME COLUMN collaborators TO collaborators_old;

-- Ou remover completamente
-- ALTER TABLE projects DROP COLUMN collaborators;
```

## Alterações no Código

### Repository (`projects.repository.js`)

Todos os métodos foram atualizados para:

- Usar JOINs com `projects_members` ao invés de processar JSONB
- Filtrar por `deleted = false` e `suspended = false`
- Usar `role` ao invés de `permission`

### Controller (`projects.controller.js`)

Alterações principais:

- Trocado `permission` por `role` em todos os endpoints
- Removido filtros `.filter((c) => !c.removed)` pois a query já filtra
- Atualizado validação de limites para buscar da tabela

## Endpoints Afetados

Todos os endpoints relacionados a colaboradores:

- `PUT /api/projects/:projectId/collaborators` - Gerenciar colaboradores
- `POST /api/projects/:projectId/collaborators` - Adicionar colaborador
- `GET /api/projects/:projectId/collaborators` - Listar colaboradores
- `PATCH /api/projects/:projectId/collaborators/:collaboratorId` - Atualizar role
- `DELETE /api/projects/:projectId/collaborators/:collaboratorId` - Remover

### Mudanças na API

**Antes:**

```json
{
  "action": "add",
  "userId": "uuid",
  "permission": "admin"
}
```

**Depois:**

```json
{
  "action": "add",
  "userId": "uuid",
  "role": "admin"
}
```

## Estrutura de Retorno

Os colaboradores agora retornam:

```json
{
  "user_id": "uuid",
  "name": "Nome do Usuário",
  "username": "username",
  "email": "email@example.com",
  "avatar_url": "https://...",
  "role": "admin",
  "added_at": "2024-01-01T00:00:00Z",
  "added_by": "uuid",
  "suspended": false
}
```

Campos removidos: `removed`, `removed_at`, `permission`

## Rollback

Se necessário reverter:

```sql
-- Restaurar coluna de backup
ALTER TABLE projects RENAME COLUMN collaborators_old TO collaborators;

-- Ou reconstruir JSONB a partir da tabela
UPDATE projects p
SET collaborators = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', pm.user_id::text,
      'name', u.name,
      'username', u.username,
      'email', u.email,
      'avatar_url', u.avatar_url,
      'permission', pm.role::text,
      'added_at', pm.created_at,
      'removed', pm.deleted,
      'removed_at', CASE WHEN pm.deleted THEN pm.updated_at ELSE NULL END
    )
  ), '[]'::jsonb)
  FROM projects_members pm
  JOIN users u ON u.user_id = pm.user_id
  WHERE pm.project_id = p.id
);
```

## Testes Recomendados

1. Criar novo projeto e adicionar colaboradores
2. Atualizar role de colaborador existente
3. Remover colaborador
4. Verificar acesso de colaborador a projeto
5. Listar projetos como colaborador
6. Validar limites de plano funcionando

## Benefícios

- ✅ Melhor performance em queries (índices dedicados)
- ✅ Integridade referencial garantida por FK
- ✅ Histórico de mudanças via `updated_at`
- ✅ Facilita auditoria e relatórios
- ✅ Suporte a soft delete e suspensão
- ✅ Rastreamento de quem adicionou cada membro
