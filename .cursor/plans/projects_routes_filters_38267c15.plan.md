---
name: projects routes filters
overview: Padronizar todos os GET de projetos no `weave-api` com validação `express-validator`, paginação offset (com `next_cursor` reservado), envelope consistente e um catálogo amplo de filtros (datas, colaboradores, status, tags, prioridade, etc.) — sem mexer no front por ora.
todos:
  - id: shared-utils
    content: Criar weave-api/src/utils/http/list-query.js com parseListQuery, buildListEnvelope e sanitizadores (CSV/UUID/enum/datas/intervalos).
    status: completed
  - id: validators
    content: Criar weave-api/src/modules/projects/projects.validators.js com cadeias express-validator por endpoint e handleValidation 422.
    status: completed
  - id: routes
    content: "Atualizar projects.routes.js: anexar validators, garantir rate limiter em todos os GET, adicionar requireProjectPermission(READ_PROJECT_CONTENT) nos GETs aninhados, validar UUID dos params."
    status: completed
  - id: repo-list-where
    content: Extrair _buildProjectListWhere em projects-read.repository.js e implementar getAllProjectsFiltered com COUNT OVER() para total.
    status: completed
  - id: repo-notes-filtered
    content: Implementar getAssociatedNotesFiltered (status, priority_id, tags, stage_id, due_range, created_by, search, paginação).
    status: completed
  - id: repo-misc
    content: Estender repositórios de collaborators/sprints/reasonings com filtros conforme seções 5.5, 5.6, 5.7.
    status: completed
  - id: controllers
    content: Refatorar projects-read.controller.js para consumir req.parsedQuery e usar buildListEnvelope (chave legada + data) em todas as listas.
    status: completed
  - id: indexes
    content: Criar migration db_structure_docs/migrations/projects_filters_indexes.sql com índices status/methodology/org/parent/datas/properties GIN e notes (due_date, priority_id) — opcional.
    status: completed
  - id: docs
    content: Adicionar tabela de filtros e envelope no README do weave-api e JSDoc nos handlers atualizados.
    status: completed
isProject: false
---

# Plano: Filtros + Hardening dos GETs de Projetos (`weave-api`)

## 1. Princípios

- **Sem mudar contratos quebrando o front:** todos os filtros novos são opcionais. Endpoints existentes mantêm o comportamento atual quando nenhum query param novo é enviado.
- **Stack mantida:** JS + JSDoc (regra do projeto), `express-validator` (já no `package.json`), parametrização total no `pg`.
- **Segurança first:** whitelists de enums, caps em `limit`, sortBy travado, UUID/timestamp validados, sem string concat em SQL.
- **Padrão de mercado:** offset híbrido com `page/limit/total/total_pages/has_next` + `next_cursor` reservado (string opaca), `sort=field:asc`, multi-valor via vírgula, datas em ISO 8601.

## 2. Convenção de Query Strings (resumo, market-style)

- Paginação: `?page=1&limit=20` (default 20, max 100). Resposta inclui `next_cursor: null` para evolução futura sem quebra.
- Ordenação: `?sort=created_at:desc` (campos numa whitelist por endpoint).
- Multi-valor: `?status=OPEN,IN_PROGRESS` (vírgula). UUIDs idem.
- Intervalos: sufixos `_from` / `_to` em ISO 8601 (timestamptz) ou `YYYY-MM-DD` (date).
- Busca textual: `?search=` (trim, max 120 chars, `ILIKE` parametrizado).
- Inclusões opcionais (sparse): `?include=collaborators,notes,subprojects` para evitar payloads gigantes em listas.

## 3. Envelope Padrão de Resposta (todas as listas)

```
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 137, "total_pages": 7, "has_next": true, "next_cursor": null },
  "sort": { "field": "created_at", "order": "desc" },
  "filters_applied": { ... echo dos filtros normalizados ... }
}
```

Como o front atual consome `{ projects: [...] }`, `{ collaborators: [...] }`, `{ notes: [...] }` e `{ sprints: [...] }`, vamos:

- Manter as **chaves legadas** (`projects`, `collaborators`, `notes`, `sprints`, `reasonings`) como aliases de `data` no mesmo objeto durante a janela de migração, para não exigir mudanças simultâneas no `weave-app`.
- Marcar as chaves legadas como `@deprecated` no JSDoc dos repositórios/controllers.

## 4. Novos arquivos

- `weave-api/src/utils/http/list-query.js` (novo): helpers compartilhados para todas as listas
  - `parseListQuery(req, schema)` — extrai `page`, `limit`, `sort`, `include` aplicando whitelists.
  - `buildListEnvelope({ data, page, limit, total, sort, filters, legacyKey })` — monta o envelope padrão + alias legado.
  - `parseCsvUuid`, `parseCsvEnum`, `parseDateRange`, `parseRangeNumber` — sanitizadores reutilizáveis.

- `weave-api/src/modules/projects/projects.validators.js` (novo): cadeias de `express-validator` por endpoint, exportando middlewares prontos:
  - `validateGetProjects`, `validateGetProjectById`, `validateGetProjectNotes`, `validateGetProjectCollaborators`, `validateGetProjectSprints`, `validateGetProjectReasonings`, `validateGetProjectStages`.
  - Um único `handleValidation` que responde `422` com `{ error: { message, details: [{path, msg}] } }` se houver erro.

## 5. Filtros por Endpoint

### 5.1. `GET /api/v1/projects` (lista raiz)

Filtros suportados (todos opcionais, validados em [projects.validators.js](weave-api/src/modules/projects/projects.validators.js)):

- `search` (string, ≤120, busca em `title`/`description` via ILIKE).
- `status` (CSV de `OPEN|IN_PROGRESS|PAUSED|COMPLETED|ARCHIVED`).
- `methodology` (CSV de `KANBAN|SCRUM|WATERFALL|CUSTOM`).
- `visibility` (CSV de `PRIVATE|...` conforme enum existente).
- `ownership` (`owned|collaborating|all`, default `all`).
- `owner_user_id` (UUID).
- `collaborator_user_id` (UUID — projetos onde este user é membro).
- `workspace_id` (UUID — sobrepõe o auto-scope quando o caller tem `ACCESS_ALL_WORKSPACE_PROJECTS`).
- `parent_only` (bool, default `true`).
- `has_parent` (bool — força só subprojetos quando `true`).
- `created_from`, `created_to` (ISO timestamptz).
- `updated_from`, `updated_to`.
- `start_from`, `start_to` (date).
- `target_end_from`, `target_end_to` (date).
- `progress_min`, `progress_max` (0–100, numérico).
- `priority` (CSV de `alta|media|baixa` — lookup em `properties->>'priority'`).
- `tags` (CSV de strings — `properties->'tags'` deve conter todos via `?|` ou `@>`).
- `active` (bool).
- Paginação/sort/include conforme seção 2.
- `sort` whitelist: `created_at|updated_at|title|progress|start_date|target_end_date`.

Implementação:

- Adicionar `getAllProjectsFiltered(scope, filters, pagination, sort)` em [projects-read.repository.js](weave-api/src/modules/projects/repositories/projects-read.repository.js) — usa `WITH base AS (...)` + `COUNT(*) OVER()` para devolver `total` numa única query, e mantém o `JOIN` de `users/workspaces/project_members` atual.
- Mantém os dois caminhos atuais (org-wide vs user-scope) reaproveitando o mesmo `whereClause` builder usado em `getProjectStats`.

### 5.2. `GET /api/v1/projects/:id`

- Validar `id` como UUID.
- Adicionar `?include=collaborators,notes,subprojects,stages` para permitir respostas mais leves quando o front só precisa do projeto.
- Manter a resposta atual quando `include` não é informado (compat).

### 5.3. `GET /api/v1/projects/:id/stages`

- Filtros: `include_done` (bool), `search` (string ≤80 sobre `name`).
- Sort whitelist: `position|name|created_at`.

### 5.4. `GET /api/v1/projects/:projectId/notes`

Filtros (campos da nota dentro do projeto, nada de SQL extra que não seja parametrizado):

- `status` (CSV de `notes_status`).
- `priority_id` (CSV de UUID).
- `tags` (CSV de UUID — alinhado com `notes.tags uuid[]` real do schema, `n.tags @> $::uuid[]`).
- `stage_id` (CSV de UUID, `n.project_stage_id`).
- `created_by` (CSV de UUID).
- `due_from`, `due_to` (timestamptz, `n.due_date`).
- `created_from/to`, `updated_from/to`.
- `search` (string ≤120 sobre `title`/`description`).
- Paginação + sort (`updated_at|created_at|due_date|title`).

Implementação: adicionar `getAssociatedNotesFiltered(projectId, scope, filters, pagination)` em [projects-read.repository.js](weave-api/src/modules/projects/repositories/projects-read.repository.js); reaproveita o `EXISTS` de acesso já presente em `getAssociatedNotes`.

### 5.5. `GET /api/v1/projects/:projectId/collaborators`

- `role` (CSV de `PROJECT_MANAGER|CONTRIBUTOR|COMMENTER|VIEWER`).
- `suspended` (bool).
- `search` (string ≤80, busca em `users.name|username|email`).
- `added_from`, `added_to`.
- Paginação + sort (`created_at|role|name`).
- **Hardening:** adicionar `requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT)` na rota (hoje só passa por `verifyToken`).

### 5.6. `GET /api/v1/projects/:id/sprints`

- `status` (CSV de `active|completed|planned`).
- `start_from`, `start_to`, `end_from`, `end_to`.
- Paginação + sort (`start_date|end_date|sprint_number`).
- Manter `limit` legado (já existe), mas dentro do novo cap.

### 5.7. `GET /api/v1/projects/:id/reasonings`

- Já tem `sprintId|reasoningType|limit`. Estender com:
- `from`, `to` (range em `created_at`), `is_read`, `is_pinned`, `is_dismissed` (bool), `created_by` (UUID).
- Paginação + sort (`created_at|updated_at`).

## 6. Aplicação nas Rotas

Atualizar [projects.routes.js](weave-api/src/modules/projects/projects.routes.js) inserindo os middlewares de validação antes dos controllers — exemplo do padrão final:

```js
const v = require("@/modules/projects/projects.validators");

router.get(
  "/",
  highTrafficLimiter,
  v.validateGetProjects,
  ProjectsReadController.getAllProjects.bind(ProjectsReadController)
);

router.get(
  "/:projectId/notes",
  highTrafficLimiter,
  v.validateGetProjectNotes,
  ProjectsReadController.getAssociatedNotes.bind(ProjectsReadController)
);

router.get(
  "/:projectId/collaborators",
  highTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  v.validateGetProjectCollaborators,
  ProjectsReadController.getCollaborators.bind(ProjectsReadController)
);
```

Outros ajustes da rota:

- Aplicar `highTrafficLimiter` em **todos** os GET (alguns hoje não têm rate limit explícito: stages, sprints, reasonings, notes, collaborators).
- Reordenar rotas para garantir que `/stats`, `/with-user` etc. fiquem **antes** de `/:id` (já está, manter).
- Adicionar `validateUuidParam("id"|"projectId"|"stageId"|"sprintId"|"reasoningId"|"itemId")` reutilizável nas rotas com `:id`/`:projectId` — protege contra `id` inválido virar erro 500 no `executeQuery` por cast `::uuid`.

## 7. Repositório: builder de WHERE reutilizável

Criar uma função privada `_buildProjectListWhere({ scope, filters })` em [projects-read.repository.js](weave-api/src/modules/projects/repositories/projects-read.repository.js) que devolve `{ whereClause, params, paramIndex }`. Atual `getProjectStats`/`getProjectStatsForWorksapceanization` (linhas 614 em diante) já usam esse padrão de `conditions[]` + `paramIndex` — vamos extrair e reaproveitar para `getAllProjectsFiltered`.

Para `total` numa única ida ao banco, usar `COUNT(*) OVER() AS total_count` na CTE — evita um `SELECT COUNT(*)` extra e aproveita o mesmo `WHERE`.

## 8. Camada Controller

Refatorar [projects-read.controller.js](weave-api/src/modules/projects/controllers/projects-read.controller.js):

- Cada handler recebe `req` já com `req.parsedQuery` injetado pelo middleware de validação (após `matchedData(req)`), evitando re-parsear.
- O método monta `filters_applied` (echo) e usa `buildListEnvelope` para emitir resposta.
- Erros de validação não chegam aqui (são respondidos no middleware como `422`).
- `_handleError` continua para erros de domínio/acesso.

## 9. Performance e Índices (SQL — opcional mas recomendado)

Adicionar uma migration `db_structure_docs/migrations/projects_filters_indexes.sql`:

- `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_projects_methodology ON projects(methodology) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_projects_workspace_active ON projects(workspace_id, active) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, target_end_date) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_projects_properties_gin ON projects USING gin (properties jsonb_path_ops);` (acelera `properties @> '{"priority":"alta"}'` e `properties->'tags' ?| ...`).
- `CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date) WHERE deleted = false;`
- `CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority_id) WHERE deleted = false;`

Tratar como **opcional / segunda fase** — não bloqueia a entrega dos filtros.

## 10. Resposta a Erros e Segurança

- Validação retorna `422 Unprocessable Entity` com `{ error: { message: "Validation failed", details: [...] } }`.
- IDs de path inválidos → `400 Bad Request` (não 500).
- Manter `_handleError` para `404` (não encontrado / sem acesso).
- Caps fixos: `limit ≤ 100`, `search ≤ 120 chars`, `tags ≤ 50 itens`, `status/methodology ≤ 10 valores na CSV`.
- Strip de chaves desconhecidas do `req.query` antes do controller (`matchedData(req, { onlyValidData: true })`).

## 11. Documentação

- Atualizar JSDoc em cada handler do controller com `@example` de query string e payload de resposta.
- Pequena seção em [weave-api/README.md](weave-api/README.md) com a tabela de filtros por rota e a convenção de envelope.

## 12. Não-objetivos (para manter o escopo enxuto)

- Não trocamos para cursor real agora — `next_cursor` fica reservado (`null`).
- Não mexemos no front (`weave-app/app/_services/projects-service/projects-service.ts`); só publicamos os filtros como compatíveis. O front migra em PR seguinte.
- Não tocamos em `POST/PUT/PATCH/DELETE` de projetos.
- Sem mudança em rotas públicas (`/api/public/v1`); só nas rotas internas autenticadas.
