# Notes Module

Módulo de notas com suporte a blocos hierárquicos, colaboração multi-usuário e controle de uso por plano.

---

## Rotas

Todas as rotas requerem `verifyToken` (aplicado globalmente via `router.use`).

### Notas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/notes` | Listar notas do usuário (com paginação opcional) |
| GET | `/api/v1/notes/stats` | Estatísticas gerais das notas |
| GET | `/api/v1/notes/:id` | Buscar nota por ID |
| POST | `/api/v1/notes` | Criar nota |
| POST | `/api/v1/notes/complete` | Criar nota com bloco inicial |
| PUT | `/api/v1/notes/:id` | Atualizar nota (parcial) |
| DELETE | `/api/v1/notes` | Deletar nota(s) — recebe `ids` no body |
| GET | `/api/v1/notes/:noteId/export/pdf` | Exportar nota como PDF |

### Blocos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/notes/:noteId/blocks` | Listar blocos (árvore hierárquica) |
| POST | `/api/v1/notes/:id/blocks` | Criar bloco |
| PUT | `/api/v1/notes/:noteId/blocks/:blockId` | Atualizar bloco |
| PUT | `/api/v1/notes/:noteId/blocks/reorder` | Reordenar blocos |
| DELETE | `/api/v1/notes/:noteId/blocks/:blockId` | Deletar bloco (soft delete) |

### Colaboradores

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/notes/:noteId/collaborators` | Listar colaboradores |
| POST | `/api/v1/notes/:noteId/collaborators` | Adicionar colaborador |
| PUT | `/api/v1/notes/:noteId/recuseCollaboration` | Colaborador se remove da nota |
| DELETE | `/api/v1/notes/:noteId/collaborators/:collaboratorId` | Dono remove colaborador |

---

## Controle de Acesso

O controller usa dois métodos de validação de acesso:

- **`_validateNoteAccess(noteId, userId)`** — verifica se o usuário é dono OU colaborador. Usado em leitura, edição de nota/blocos e listagem de colaboradores.
- **`_validateNoteOwnership(noteId, userId)`** — verifica se é o dono. Usado em deleção de nota, adição/remoção de colaboradores.

Permissões retornadas no `GET /:id`:

```json
{
  "access": {
    "isOwner": true,
    "isCollaborator": false,
    "canEdit": true,
    "canDelete": true,
    "canShare": true
  }
}
```

Apenas o dono pode: deletar nota, marcar como `deleted`, adicionar/remover colaboradores. Colaboradores podem: ler, editar campos e manipular blocos.

---

## Notas

### GET `/` — Listar notas

Sem query params retorna todas as notas. Com qualquer param de paginação/filtro, usa paginação.

**Query params:**

| Param | Default | Descrição |
|-------|---------|-----------|
| `page` | 1 | Página atual |
| `limit` | 10 (max 50) | Itens por página |
| `search` | — | Busca em título e descrição (ILIKE) |
| `tags` | — | Filtro por tags, separadas por vírgula (operador `&&` — interseção) |
| `sortBy` | `updated_at` | Campo de ordenação: `updated_at`, `created_at`, `title` |
| `sortOrder` | `desc` | `asc` ou `desc` |

Cada nota na resposta inclui: dados da nota, autor, projeto associado, organização associada, colaboradores (JSON aggregado) e blocos organizados em árvore.

Resposta paginada inclui:

```json
{
  "pagination": {
    "currentPage": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false,
    "hasMore": true
  },
  "notes": [...]
}
```

### POST `/` — Criar nota

**Body:**

| Campo | Tipo | Obrigatório | Default |
|-------|------|-------------|---------|
| `title` | string | Sim | — |
| `description` | string | Não | — |
| `tags` | string[] | Não | `[]` |
| `status` | string | Não | `"visible"` |
| `project_id` | string | Não | `null` |

Valida limite de notas do plano do usuário via `PlanUsageManager.checkLimit()` antes de criar. Incrementa uso após criação.

**Status permitidos:** `visible`, `secure`, `archived`

### POST `/complete` — Criar nota com bloco

Mesmo body de `POST /` mais:

| Campo | Tipo | Default |
|-------|------|---------|
| `initialBlockContent` | string | `""` |

Executa criação da nota + bloco inicial em uma única query (CTE com `INSERT ... RETURNING`). Retorna estrutura completa com dados do usuário e bloco embutido.

### PUT `/:id` — Atualizar nota

Atualização parcial — apenas campos enviados no body são atualizados. Campos atualizáveis: `title`, `description`, `tags`, `status`, `deleted`, `project_id`.

Restrições:
- `deleted` só pode ser alterado pelo dono
- `status` deve ser um dos permitidos
- Ao menos um campo deve ser fornecido

### DELETE `/` — Deletar nota(s)

Soft delete (marca `deleted = true`). Aceita:
- `ids` (array) no body para deleção em lote
- `id` via route param para deleção individual

Valida ownership de cada nota. Decrementa uso no plano.

### GET `/:noteId/export/pdf` — Exportar PDF

Valida limite de exportações mensais do plano. Gera PDF via `PDFService.generateNotePDF()` com dados da nota + blocos em árvore. Incrementa contador de exportações. Retorna buffer com headers `Content-Type: application/pdf` e `Content-Disposition: attachment`.

### GET `/stats` — Estatísticas

Retorna:

```json
{
  "totalNotes": 42,
  "totalTags": 15,
  "statusDistribution": { "visible": 30, "archived": 12 },
  "mostUsedTags": [{ "tag": "react", "count": 8 }]
}
```

A query também calcula `activity_metrics` (notas compartilhadas, privadas, criadas nos últimos 7/30 dias).

---

## Blocos

Blocos representam o conteúdo dentro de uma nota. Estrutura hierárquica com suporte a aninhamento via `parent_id`.

### Tipos de bloco

`text`, `paragraph`, `heading`, `h1`, `h2`, `h3`, `todo`, `list`, `page`, `code`, `quote`, `image`, `divider`

### Estrutura do bloco

```json
{
  "id": "1",
  "note_id": "10",
  "user_id": "5",
  "parent_id": null,
  "type": "paragraph",
  "text": "Conteúdo do bloco",
  "properties": {},
  "done": false,
  "position": 0,
  "level": 0,
  "children": []
}
```

### GET `/:noteId/blocks`

Retorna blocos via query recursiva (`WITH RECURSIVE`) ordenados por `level` e `position`. O `buildBlockTree()` monta a árvore em memória a partir da lista plana.

### POST `/:id/blocks`

**Body:**

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `type` | string | Sim |
| `text` | string | Não |
| `properties` | object | Não |
| `done` | boolean | Não (apenas para `todo`) |
| `parentId` | string | Não |
| `position` | number | Não (auto-calculado) |

Se `position` não é fornecido, calcula automaticamente a próxima posição entre os blocos do mesmo nível (`_getNextPosition`).

### PUT `/:noteId/blocks/:blockId`

Campos atualizáveis: `type`, `text`, `properties`, `done`, `position`. Query dinâmica — só atualiza os campos enviados. Verifica se o bloco pertence à nota.

### PUT `/:noteId/blocks/reorder`

**Body:**

```json
{
  "blocks": [
    { "id": "1", "position": 0 },
    { "id": "2", "position": 1 }
  ]
}
```

Cada item deve ter `id` (string) e `position` (number).

### DELETE `/:noteId/blocks/:blockId`

Soft delete — marca `deleted = true`. Verifica pertinência à nota.

---

## Colaboradores

### POST `/:noteId/collaborators`

**Body:** `{ "userId": "<collaborator_id>" }`

Fluxo:
1. Valida ownership da nota
2. Valida limite de colaboradores do plano (`max_collaborators_per_note`)
3. Impede adicionar a si mesmo
4. Se o colaborador foi removido anteriormente, reativa (`removed = false`)
5. Se é novo, insere na tabela `note_collaborators`
6. Envia email de notificação via `collabMail()` (não bloqueia resposta se falhar)

### DELETE `/:noteId/collaborators/:collaboratorId`

Soft delete: marca `removed = true`, `removed_by = 'owner'`, `removed_at = NOW()`. Requer ownership.

### PUT `/:noteId/recuseCollaboration`

Permite que o próprio colaborador se remova. Marca `removed_by = 'itself'`. Impede o dono de "recusar" a própria nota.

### GET `/:noteId/collaborators`

Lista todos os colaboradores (incluindo removidos). Requer acesso (dono ou colaborador).

---

## Repository

### NotesRepository

| Método | Descrição |
|--------|-----------|
| `createNotesQuery(userId, title, content, tags, status, projectId)` | Insert básico |
| `createCompleteNote(userId, title, desc, tags, content, status, projectId)` | Insert nota + bloco em CTE |
| `getAllNotesByUserId(userId)` | Todas as notas (próprias + colaborações) |
| `getAllNotesFormatted(userId)` | Igual acima, com JOINs em user/project/collaborators |
| `getAllNotesWithPagination(userId, options)` | Paginação, busca, filtro por tags, ordenação |
| `getNoteById(noteId)` | Nota completa com JOINs (user, project, org, collaborators) |
| `getAllNotesStats(userId)` | Estatísticas: totais, tags, distribuição de status, métricas de atividade |
| `updateNoteById(noteId, updateData)` | Update dinâmico dos campos permitidos |
| `deleteNoteById(noteIds)` | Soft delete em lote (`deleted = true`) |
| `addCollaborator(noteId, userId)` | Insere ou reativa colaborador |
| `removeCollaborator(noteId, userId)` | Soft delete com `removed_by = 'owner'` |
| `recuseCollaboration(noteId, userId)` | Soft delete com `removed_by = 'itself'` |
| `getCollaboratorsByNoteId(noteId)` | Lista colaboradores com dados do user |
| `isCollaborator(noteId, userId)` | Verifica se é colaborador ativo |
| `processNotesWithSignedUrls(notes)` | Processa URLs de avatares (preparado para signed URLs) |

### BlocksRepository

| Método | Descrição |
|--------|-----------|
| `getBlocksByNoteId(noteId)` | Query recursiva (`WITH RECURSIVE`) para buscar árvore de blocos |
| `getBlockById(blockId)` | Busca bloco por ID (exclui deletados) |
| `createBlock({ noteId, userId, parentId, type, text, properties, done, position })` | Cria bloco com posição auto-calculada se omitida |
| `updateBlock(blockId, updateData)` | Update dinâmico dos campos permitidos |
| `deleteBlock(blockId)` | Soft delete |
| `reorderBlocks(blockPositions)` | Atualiza posições de múltiplos blocos |
| `buildBlockTree(blocks)` | Monta árvore hierárquica a partir de lista plana |
| `_getNextPosition(noteId, parentId)` | Calcula `MAX(position) + 1` para o nível |

---

## Tratamento de Erros

O `_handleError()` mapeia mensagens de erro para status HTTP:

| Mensagem contém | Status |
|-----------------|--------|
| "obrigatório" | 400 |
| "não encontrada" / "Acesso negado" | 404 |
| Outros | Delegado ao `next(error)` (500) |

Erros de plano retornam `403` com mensagem descritiva do limite atingido.

---

## Integração com Planos

Operações que consomem recursos do plano:

| Operação | Verificação | Consumo |
|----------|-------------|---------|
| Criar nota | `limits.max_notes` vs `usage_summary.notes_total` | `consumeNoteCreation()` |
| Deletar nota | — | `decrementNoteUsage()` |
| Exportar PDF | `limits.exports.notes_monthly` vs `monthly_cycle.exports.notes_count` | `consumeExport()` |
| Adicionar colaborador | `limits.max_collaborators_per_note` vs contagem atual | — |

---

## Tabelas Utilizadas

| Tabela | Uso |
|--------|-----|
| `notes` | Dados da nota (title, description, tags, status, project_id, deleted) |
| `blocks` | Conteúdo da nota (type, text, properties, done, position, parent_id, deleted) |
| `note_collaborators` | Relação N:N entre notas e colaboradores (added_at, removed, removed_by, removed_at) |
| `users` | Dados do autor e colaboradores |
| `projects` | Projeto associado à nota (opcional) |
| `organizations` | Organização via projeto |
| `plans` / `plans_usage` | Verificação de limites |

---

_Atualizado em: Fevereiro de 2026_
