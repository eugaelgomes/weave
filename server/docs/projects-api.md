# API de Projetos - Documentação

## Visão Geral

API RESTful consolidada para gerenciamento de projetos, colaboradores e notas associadas.

---

## Rotas de Projetos

### 1. Listar Todos os Projetos

**GET** `/api/projects`

Retorna todos os projetos do usuário autenticado com dados completos.

**Response:**

```json
{
  "projects": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "description": "string",
      "properties": {},
      "status": "ativo|arquivado|concluído",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "deleted": false,
      "owner": {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "name": "string",
        "avatar_url": "string"
      },
      "collaborators": [...],
      "notes": [...]
    }
  ]
}
```

---

### 2. Criar Novo Projeto

**POST** `/api/projects`

Cria um novo projeto para o usuário autenticado.

**Body:**

```json
{
  "title": "string (obrigatório)",
  "description": "string (opcional)",
  "status": "ativo|arquivado|concluído (opcional, default: ativo)",
  "properties": {} // opcional
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "properties": {},
  "status": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted": false
}
```

---

### 3. Buscar Projeto Específico

**GET** `/api/projects/:id`

Retorna detalhes de um projeto específico.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "properties": {},
  "status": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "deleted": false
}
```

---

### 4. Atualizar Projeto (CONSOLIDADO)

**PUT** `/api/projects/:id`

Atualiza campos do projeto. **Apenas os campos enviados são modificados**, os demais permanecem intactos.

**Body (todos opcionais):**

```json
{
  "title": "string",
  "description": "string",
  "status": "ativo|arquivado|concluído",
  "properties": {
    "cor": "#ff0000",
    "icone": "📁",
    // Novas propriedades serão mescladas com as existentes
  }
}
```

**Exemplos de uso:**

1. **Atualizar apenas título:**

```json
{ "title": "Novo Título" }
```

2. **Atualizar status e properties:**

```json
{
  "status": "concluído",
  "properties": { "cor": "#00ff00" }
}
```

3. **Adicionar novas propriedades (merge):**

```json
{
  "properties": {
    "priority": "alta",
    "estimated_time": "2024-12-31T23:59:59Z"
  }
}
```

**Response:** `200 OK`

```json
{
  "message": "Projeto atualizado com sucesso",
  "project": { ... }
}
```

---

## Properties - Campos Permitidos

As `properties` de um projeto seguem um schema específico:

```typescript
{
  "priority": "alta" | "media" | "baixa",     // Prioridade do projeto
  "tags": ["tag1", "tag2"],                    // Array de tags
  "estimated_time": "2024-12-31T23:59:59Z",   // Data/hora estimada (ISO 8601)
  "progress": 0-100,                           // Calculado automaticamente (READ-ONLY)
  "complexity": "alta" | "media" | "baixa",   // Complexidade do projeto
  "color": "#ff0000",                          // Cor em hexadecimal
  "icon": "📁"                                 // Emoji escolhido
}
```

### Regras de Validação

1. **priority**: Apenas valores `"alta"`, `"media"` ou `"baixa"` são permitidos
2. **tags**: Deve ser um array (pode estar vazio: `[]`)
3. **estimated_time**: Deve ser uma data válida no formato ISO 8601
4. **progress**: **CALCULADO AUTOMATICAMENTE** com base nas notas com status "done" (não pode ser alterado manualmente)
5. **complexity**: Apenas valores `"alta"`, `"media"` ou `"baixa"` são permitidos
6. **color**: Deve ser uma cor hexadecimal válida (ex: `#ff0000`, `#fff`)
7. **icon**: Deve ser uma string (emoji recomendado)

### Cálculo Automático de Progress

O campo `progress` é calculado automaticamente usando a fórmula:

```
progress = (notas com status "done" / total de notas) × 100
```

Ele é atualizado automaticamente quando:

- Uma nota é adicionada ao projeto
- Uma nota é removida do projeto
- O status de uma nota associada é atualizado
- Properties são atualizadas

**Exemplos:**

- Projeto com 10 notas, 5 com status "done" → `progress = 50`
- Projeto sem notas → `progress = 0`
- Projeto com todas notas "done" → `progress = 100`

---

### 5. Deletar Projeto

**DELETE** `/api/projects/:id`

Remove um projeto (soft delete).

**Response:** `200 OK`

```json
{
  "message": "Projeto deletado com sucesso"
}
```

---

## Rotas de Colaboradores

### 6. Listar Colaboradores

**GET** `/api/projects/:projectId/collaborators`

Lista todos os colaboradores ativos de um projeto.

**Response:** `200 OK`

```json
{
  "collaborators": [
    {
      "user_id": "uuid",
      "name": "string",
      "username": "string",
      "email": "string",
      "avatar_url": "string",
      "permission": "admin|viewer",
      "added_at": "timestamp",
      "removed": false
    }
  ]
}
```

---

### 7. Gerenciar Colaboradores (CONSOLIDADO)

**PUT** `/api/projects/:projectId/collaborators`

Endpoint único para adicionar, atualizar permissão ou remover colaboradores.

#### **Ação: Adicionar Colaborador**

```json
{
  "action": "add",
  "userId": "uuid",
  "permission": "admin|viewer" // opcional, default: "viewer"
}
```

**Response:** `200 OK`

```json
{
  "message": "Colaborador adicionado com sucesso",
  "collaborators": [...]
}
```

---

#### **Ação: Atualizar Permissão**

```json
{
  "action": "update",
  "userId": "uuid",
  "permission": "admin|viewer"
}
```

**Response:** `200 OK`

```json
{
  "message": "Permissão atualizada com sucesso",
  "collaborators": [...]
}
```

---

#### **Ação: Remover Colaborador**

```json
{
  "action": "remove",
  "userId": "uuid"
}
```

**Response:** `200 OK`

```json
{
  "message": "Colaborador removido com sucesso"
}
```

---

## Rotas de Notas Associadas

### 8. Listar Notas do Projeto

**GET** `/api/projects/:projectId/notes`

Lista todas as notas associadas ao projeto.

**Response:** `200 OK`

```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "tags": [],
      "status": "string",
      "created_by": {
        "user_id": "uuid",
        "username": "string"
      },
      "collaborators": [...],
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

---

### 9. Gerenciar Notas (CONSOLIDADO)

**PUT** `/api/projects/:projectId/notes`

Endpoint único para adicionar, sincronizar ou remover notas do projeto.

#### **Ação: Adicionar Nota**

Associa uma nota existente ao projeto.

```json
{
  "action": "add",
  "noteId": "uuid"
}
```

**Response:** `200 OK`

```json
{
  "message": "Nota adicionada ao projeto com sucesso",
  "notes": [...]
}
```

---

#### **Ação: Sincronizar Nota**

Atualiza os dados da nota associada com base na tabela `notes`.

```json
{
  "action": "sync",
  "noteId": "uuid"
}
```

**Response:** `200 OK`

```json
{
  "message": "Nota sincronizada com sucesso",
  "notes": [...]
}
```

---

#### **Ação: Remover Nota**

Remove a associação da nota com o projeto (não deleta a nota).

```json
{
  "action": "remove",
  "noteId": "uuid"
}
```

**Response:** `200 OK`

```json
{
  "message": "Nota removida do projeto com sucesso"
}
```

---

## Códigos de Status HTTP

| Código | Significado                          |
| ------- | ------------------------------------ |
| 200     | OK - Operação bem-sucedida         |
| 201     | Created - Recurso criado             |
| 400     | Bad Request - Dados inválidos       |
| 401     | Unauthorized - Não autenticado      |
| 404     | Not Found - Recurso não encontrado  |
| 500     | Internal Server Error - Erro interno |

---

## Observações

1. **Todas as rotas exigem autenticação** via token JWT
2. **Updates parciais**: Apenas campos enviados são atualizados
3. **Properties merge**: Propriedades são mescladas, não substituídas
4. **Soft delete**: Projetos deletados permanecem no banco com flag `deleted=true`
5. **Colaboradores**: Apenas o dono do projeto pode gerenciar colaboradores
6. **Notas**: Colaboradores com permissão podem gerenciar notas associadas

---

## Exemplos de Fluxo

### Criar e Configurar um Projeto Completo

```javascript
// 1. Criar projeto
POST /api/projects
{
  "title": "Meu Projeto",
  "description": "Descrição detalhada",
  "properties": { "cor": "#ff0000" }
}

// 2. Adicionar colaborador
PUT /api/projects/{projectId}/collaborators
{
  "action": "add",
  "userId": "uuid-colaborador",
  "permission": "admin"
}

// 3. Adicionar nota ao projeto
PUT /api/projects/{projectId}/notes
{
  "action": "add",
  "noteId": "uuid-nota"
}

// 4. Atualizar apenas properties
PUT /api/projects/{projectId}
{
  "properties": {
    "priority": "alta",
    "complexity": "media",
    "color": "#ff5500",
    "icon": "🚀",
    "tags": ["urgente", "importante"],
    "estimated_time": "2025-01-15T18:00:00Z"
  }
}

// 5. Ver progress calculado automaticamente
GET /api/projects/{projectId}
// Response incluirá: "properties": { "progress": 75, ... }
```

---

## Migração de Rotas Antigas

### Rotas Removidas (Substituídas)

| Antiga                                     | Nova                                | Ação                                   |
| ------------------------------------------ | ----------------------------------- | ---------------------------------------- |
| `PATCH /projects/:id/properties`         | `PUT /projects/:id`               | Use body:`{ "properties": {...} }`     |
| `POST /projects/:id/collaborators`       | `PUT /projects/:id/collaborators` | Use body:`{ "action": "add", ... }`    |
| `PATCH /projects/:id/collaborators/:id`  | `PUT /projects/:id/collaborators` | Use body:`{ "action": "update", ... }` |
| `DELETE /projects/:id/collaborators/:id` | `PUT /projects/:id/collaborators` | Use body:`{ "action": "remove", ... }` |
| `POST /projects/:id/notes`               | `PUT /projects/:id/notes`         | Use body:`{ "action": "add", ... }`    |
| `PUT /projects/:id/notes/:noteId`        | `PUT /projects/:id/notes`         | Use body:`{ "action": "sync", ... }`   |
| `DELETE /projects/:id/notes/:noteId`     | `PUT /projects/:id/notes`         | Use body:`{ "action": "remove", ... }` |

---

## Exemplos de Erros de Validação

### 1. Priority inválida
```json
// Request:
{ "properties": { "priority": "super-alta" } }

// Response: 400 Bad Request
{ "error": "Priority deve ser: 'alta', 'media' ou 'baixa'" }
```

### 2. Cor hexadecimal inválida
```json
// Request:
{ "properties": { "color": "vermelho" } }

// Response: 400 Bad Request
{ "error": "Color deve ser uma cor hexadecimal válida (ex: #ff0000)" }
```

### 3. Tags não é array
```json
// Request:
{ "properties": { "tags": "urgente, importante" } }

// Response: 400 Bad Request
{ "error": "Tags deve ser um array" }
```

### 4. Tentativa de alterar progress manualmente
```json
// Request:
{ "properties": { "progress": 100 } }

// Response: 200 OK (progress é ignorado e recalculado)
{
  "message": "Projeto atualizado com sucesso",
  "project": {
    "properties": { "progress": 45 }  // Valor real calculado
  }
}
```

### 5. Propriedade não permitida
```json
// Request:
{ "properties": { "custom_field": "valor" } }

// Response: 400 Bad Request
{ "error": "Propriedade 'custom_field' não é permitida" }
```

### 6. Data inválida
```json
// Request:
{ "properties": { "estimated_time": "31/12/2024" } }

// Response: 400 Bad Request
{ "error": "estimated_time deve ser uma data válida (ISO 8601)" }
```
