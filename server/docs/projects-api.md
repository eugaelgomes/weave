# API de Projetos

Documentação completa da API REST para gerenciamento de projetos, colaboradores e notas associadas.

## Visão Geral

Esta API permite criar e gerenciar projetos, associar notas, adicionar colaboradores e controlar permissões de acesso. Todos os endpoints requerem autenticação via token JWT.

**Base URL:** `/api/projects`

**Autenticação:** Bearer Token (Header: `Authorization: Bearer <token>`)

---

## Índice

- [Projetos](#projetos)
  - [Listar Projetos](#1-listar-projetos)
  - [Criar Projeto](#2-criar-projeto)
  - [Buscar Projeto](#3-buscar-projeto)
  - [Atualizar Projeto](#4-atualizar-projeto)
  - [Deletar Projeto](#5-deletar-projeto)
- [Colaboradores](#colaboradores)
  - [Listar Colaboradores](#6-listar-colaboradores)
  - [Gerenciar Colaboradores](#7-gerenciar-colaboradores)
- [Notas](#notas)
  - [Listar Notas](#8-listar-notas)
  - [Gerenciar Notas](#9-gerenciar-notas)
- [Schema de Dados](#schema-de-dados)
- [Códigos de Status](#códigos-de-status)

---

## Projetos

### 1. Listar Projetos

Lista todos os projetos pertencentes ao usuário autenticado, incluindo informações completas sobre proprietário, colaboradores e notas associadas.

**Endpoint:** `GET /api/projects`

**Autenticação:** Obrigatória

**Parâmetros:** Nenhum

**Resposta de Sucesso:** `200 OK`

```json
{
  "projects": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Projeto de Implementação",
      "description": "Projeto para implementar novos recursos",
      "properties": {
        "priority": "alta",
        "tags": ["backend", "api"],
        "estimated_time": "2024-12-31T23:59:59Z",
        "progress": 65,
        "complexity": "alta",
        "color": "#ff5722",
        "icon": "🚀"
      },
      "status": "ativo",
      "created_at": "2024-11-01T10:00:00Z",
      "updated_at": "2024-11-15T14:30:00Z",
      "deleted": false,
      "owner": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "joao.silva",
        "email": "joao.silva@example.com",
        "name": "João Silva",
        "avatar_url": "https://example.com/avatars/joao.jpg"
      },
      "collaborators": [
        {
          "user_id": "550e8400-e29b-41d4-a716-446655440002",
          "name": "Maria Santos",
          "username": "maria.santos",
          "email": "maria.santos@example.com",
          "avatar_url": "https://example.com/avatars/maria.jpg",
          "permission": "admin",
          "added_at": "2024-11-05T09:00:00Z",
          "removed": false
        }
      ],
      "notes": [
        {
          "id": "650e8400-e29b-41d4-a716-446655440003",
          "title": "Implementar autenticação",
          "description": "Adicionar sistema de login",
          "tags": ["auth", "security"],
          "status": "done",
          "created_by": {
            "user_id": "550e8400-e29b-41d4-a716-446655440001",
            "username": "joao.silva"
          },
          "created_at": "2024-11-02T11:00:00Z",
          "updated_at": "2024-11-10T16:00:00Z"
        }
      ]
    }
  ]
}
```

**Observações:**

- O campo `progress` em `properties` é calculado automaticamente com base no status das notas (somente leitura)
- Apenas colaboradores não removidos são retornados
- Projetos marcados como deletados não são incluídos

---

### 2. Criar Projeto

Cria um novo projeto para o usuário autenticado.

**Endpoint:** `POST /api/projects`

**Autenticação:** Obrigatória

**Corpo da Requisição:**

```json
{
  "title": "Projeto Alpha",
  "description": "Desenvolvimento de nova funcionalidade",
  "status": "ativo",
  "properties": {
    "priority": "alta",
    "tags": ["backend", "api"],
    "estimated_time": "2024-12-31T23:59:59Z",
    "complexity": "media",
    "color": "#3f51b5",
    "icon": "⚡"
  }
}
```

**Parâmetros:**

| Campo         | Tipo   | Obrigatório | Descrição                                                                   |
| ------------- | ------ | ----------- | --------------------------------------------------------------------------- |
| `title`       | string | Sim         | Título do projeto (máx. 255 caracteres)                                     |
| `description` | string | Não         | Descrição detalhada do projeto                                              |
| `status`      | string | Não         | Status inicial: `ativo`, `arquivado`, `concluído` (padrão: `ativo`)         |
| `properties`  | object | Não         | Propriedades adicionais (ver [Schema de Properties](#schema-de-properties)) |

**Resposta de Sucesso:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Projeto Alpha",
  "description": "Desenvolvimento de nova funcionalidade",
  "properties": {
    "priority": "alta",
    "tags": ["backend", "api"],
    "estimated_time": "2024-12-31T23:59:59Z",
    "complexity": "media",
    "color": "#3f51b5",
    "icon": "⚡",
    "progress": 0
  },
  "status": "ativo",
  "created_at": "2024-11-20T10:00:00Z",
  "updated_at": "2024-11-20T10:00:00Z",
  "deleted": false
}
```

**Erros Possíveis:**

- `400 Bad Request`: Título não fornecido ou propriedades inválidas
- `401 Unauthorized`: Token de autenticação ausente ou inválido

---

### 3. Buscar Projeto

Retorna os detalhes de um projeto específico. O usuário deve ser o proprietário do projeto.

**Endpoint:** `GET /api/projects/:id`

**Autenticação:** Obrigatória

**Parâmetros de URL:**

| Campo | Tipo | Descrição     |
| ----- | ---- | ------------- |
| `id`  | UUID | ID do projeto |

**Exemplo:** `GET /api/projects/550e8400-e29b-41d4-a716-446655440000`

**Resposta de Sucesso:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Projeto Alpha",
  "description": "Desenvolvimento de nova funcionalidade",
  "properties": {
    "priority": "alta",
    "tags": ["backend", "api"],
    "estimated_time": "2024-12-31T23:59:59Z",
    "progress": 45,
    "complexity": "media",
    "color": "#3f51b5",
    "icon": "⚡"
  },
  "status": "ativo",
  "created_at": "2024-11-20T10:00:00Z",
  "updated_at": "2024-11-25T14:30:00Z",
  "deleted": false
}
```

**Erros Possíveis:**

- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não tem acesso

---

### 4. Atualizar Projeto

Atualiza campos de um projeto existente. Suporta atualização parcial, onde apenas os campos enviados são modificados.

**Endpoint:** `PUT /api/projects/:id`

**Autenticação:** Obrigatória

**Parâmetros de URL:**

| Campo | Tipo | Descrição     |
| ----- | ---- | ------------- |
| `id`  | UUID | ID do projeto |

**Corpo da Requisição (todos os campos opcionais):**

```json
{
  "title": "Projeto Alpha - Atualizado",
  "description": "Nova descrição do projeto",
  "status": "concluído",
  "properties": {
    "priority": "media",
    "color": "#4caf50",
    "icon": "✅"
  }
}
```

**Parâmetros:**

| Campo         | Tipo   | Descrição                                                |
| ------------- | ------ | -------------------------------------------------------- |
| `title`       | string | Novo título do projeto                                   |
| `description` | string | Nova descrição                                           |
| `status`      | string | Novo status: `ativo`, `arquivado`, `concluído`           |
| `properties`  | object | Propriedades a serem mescladas (merge) com as existentes |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Projeto atualizado com sucesso",
  "project": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Projeto Alpha - Atualizado",
    "description": "Nova descrição do projeto",
    "properties": {
      "priority": "media",
      "tags": ["backend", "api"],
      "estimated_time": "2024-12-31T23:59:59Z",
      "progress": 100,
      "complexity": "media",
      "color": "#4caf50",
      "icon": "✅"
    },
    "status": "concluído",
    "created_at": "2024-11-20T10:00:00Z",
    "updated_at": "2024-11-30T16:45:00Z",
    "deleted": false
  }
}
```

**Observações:**

- `properties` são mescladas (merge) com as existentes, não sobrescritas completamente
- O campo `progress` é recalculado automaticamente ao atualizar propriedades
- Enviar um corpo vazio ou sem campos válidos retorna erro `400`

**Erros Possíveis:**

- `400 Bad Request`: Nenhum campo válido fornecido ou valores inválidos
- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não é proprietário

---

### 5. Deletar Projeto

Remove um projeto do sistema (soft delete). O projeto é marcado como deletado, mas permanece no banco de dados.

**Endpoint:** `DELETE /api/projects/:id`

**Autenticação:** Obrigatória

**Parâmetros de URL:**

| Campo | Tipo | Descrição                    |
| ----- | ---- | ---------------------------- |
| `id`  | UUID | ID do projeto a ser deletado |

**Exemplo:** `DELETE /api/projects/550e8400-e29b-41d4-a716-446655440000`

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Projeto deletado com sucesso"
}
```

**Observações:**

- Apenas o proprietário do projeto pode deletá-lo
- Soft delete: o projeto é marcado como `deleted = true`, mas não é removido fisicamente
- Colaboradores e notas associadas não são afetados

**Erros Possíveis:**

- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não é proprietário

---

## Colaboradores

### 6. Listar Colaboradores

Lista todos os colaboradores ativos de um projeto. Acessível pelo proprietário e colaboradores do projeto.

**Endpoint:** `GET /api/projects/:projectId/collaborators`

**Autenticação:** Obrigatória

**Parâmetros de URL:**

| Campo       | Tipo | Descrição     |
| ----------- | ---- | ------------- |
| `projectId` | UUID | ID do projeto |

**Exemplo:** `GET /api/projects/550e8400-e29b-41d4-a716-446655440000/collaborators`

**Resposta de Sucesso:** `200 OK`

```json
{
  "collaborators": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Maria Santos",
      "username": "maria.santos",
      "email": "maria.santos@example.com",
      "avatar_url": "https://example.com/avatars/maria.jpg",
      "permission": "admin",
      "added_at": "2024-11-05T09:00:00Z",
      "removed": false
    },
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Pedro Oliveira",
      "username": "pedro.oliveira",
      "email": "pedro.oliveira@example.com",
      "avatar_url": "https://example.com/avatars/pedro.jpg",
      "permission": "viewer",
      "added_at": "2024-11-10T14:20:00Z",
      "removed": false
    }
  ]
}
```

**Observações:**

- Apenas colaboradores não removidos (`removed = false`) são retornados
- Proprietário e colaboradores podem visualizar a lista

**Erros Possíveis:**

- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não tem acesso

---

### 7. Gerenciar Colaboradores

Endpoint consolidado para adicionar, atualizar permissões ou remover colaboradores de um projeto. Apenas o proprietário pode gerenciar colaboradores.

**Endpoint:** `PUT /api/projects/:projectId/collaborators`

**Autenticação:** Obrigatória (somente proprietário)

**Parâmetros de URL:**

| Campo       | Tipo | Descrição     |
| ----------- | ---- | ------------- |
| `projectId` | UUID | ID do projeto |

---

#### 7.1. Adicionar Colaborador

Adiciona um novo colaborador ao projeto.

**Corpo da Requisição:**

```json
{
  "action": "add",
  "userId": "550e8400-e29b-41d4-a716-446655440002",
  "permission": "viewer"
}
```

**Parâmetros:**

| Campo        | Tipo   | Obrigatório | Descrição                                         |
| ------------ | ------ | ----------- | ------------------------------------------------- |
| `action`     | string | Sim         | Deve ser `"add"`                                  |
| `userId`     | UUID   | Sim         | ID do usuário a ser adicionado                    |
| `permission` | string | Não         | Permissão: `admin` ou `viewer` (padrão: `viewer`) |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Colaborador adicionado com sucesso",
  "collaborators": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Maria Santos",
      "username": "maria.santos",
      "email": "maria.santos@example.com",
      "avatar_url": "https://example.com/avatars/maria.jpg",
      "permission": "viewer",
      "added_at": "2024-11-30T10:00:00Z",
      "removed": false
    }
  ]
}
```

**Observações:**

- Não é possível adicionar o proprietário como colaborador
- Usuário não pode estar já adicionado como colaborador ativo
- Informações do usuário são buscadas automaticamente

---

#### 7.2. Atualizar Permissão

Atualiza a permissão de um colaborador existente.

**Corpo da Requisição:**

```json
{
  "action": "update",
  "userId": "550e8400-e29b-41d4-a716-446655440002",
  "permission": "admin"
}
```

**Parâmetros:**

| Campo        | Tipo   | Obrigatório | Descrição                           |
| ------------ | ------ | ----------- | ----------------------------------- |
| `action`     | string | Sim         | Deve ser `"update"`                 |
| `userId`     | UUID   | Sim         | ID do colaborador                   |
| `permission` | string | Sim         | Nova permissão: `admin` ou `viewer` |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Permissão do colaborador atualizada com sucesso",
  "collaborators": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Maria Santos",
      "username": "maria.santos",
      "email": "maria.santos@example.com",
      "avatar_url": "https://example.com/avatars/maria.jpg",
      "permission": "admin",
      "added_at": "2024-11-30T10:00:00Z",
      "removed": false
    }
  ]
}
```

---

#### 7.3. Remover Colaborador

Remove um colaborador do projeto (soft delete).

**Corpo da Requisição:**

```json
{
  "action": "remove",
  "userId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Parâmetros:**

| Campo    | Tipo   | Obrigatório | Descrição                        |
| -------- | ------ | ----------- | -------------------------------- |
| `action` | string | Sim         | Deve ser `"remove"`              |
| `userId` | UUID   | Sim         | ID do colaborador a ser removido |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Colaborador removido com sucesso"
}
```

**Observações:**

- Remoção é soft delete: colaborador é marcado como `removed = true`
- Colaborador removido não aparece mais nas listagens

**Erros Possíveis (para todas as ações):**

- `400 Bad Request`: Ação inválida, userId não fornecido, ou permissão inválida
- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não é proprietário

---

---

## Notas

### 8. Listar Notas

Lista todas as notas associadas ao projeto. Acessível pelo proprietário e colaboradores.

**Endpoint:** `GET /api/projects/:projectId/notes`

**Autenticação:** Obrigatória

**Parâmetros de URL:**

| Campo       | Tipo | Descrição     |
| ----------- | ---- | ------------- |
| `projectId` | UUID | ID do projeto |

**Exemplo:** `GET /api/projects/550e8400-e29b-41d4-a716-446655440000/notes`

**Resposta de Sucesso:** `200 OK`

```json
{
  "notes": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440003",
      "title": "Implementar autenticação",
      "description": "Adicionar sistema de login com JWT",
      "tags": ["auth", "security", "backend"],
      "status": "done",
      "created_by": {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "joao.silva"
      },
      "collaborators": [
        {
          "user_id": "550e8400-e29b-41d4-a716-446655440002",
          "username": "maria.santos",
          "permission": "admin"
        }
      ],
      "created_at": "2024-11-02T11:00:00Z",
      "updated_at": "2024-11-10T16:00:00Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440004",
      "title": "Criar documentação da API",
      "description": "Documentar todos os endpoints",
      "tags": ["docs", "api"],
      "status": "doing",
      "created_by": {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "joao.silva"
      },
      "collaborators": [],
      "created_at": "2024-11-15T09:30:00Z",
      "updated_at": "2024-11-28T14:20:00Z"
    }
  ]
}
```

**Observações:**

- Retorna todas as notas associadas ao projeto via `associated_notes`
- Propriedade `progress` do projeto é calculada com base no status das notas

**Erros Possíveis:**

- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto não encontrado ou usuário não tem acesso

---

### 9. Gerenciar Notas

Endpoint consolidado para adicionar, sincronizar ou remover notas de um projeto. Apenas o proprietário e colaboradores com permissão `admin` podem gerenciar notas.

**Endpoint:** `PUT /api/projects/:projectId/notes`

**Autenticação:** Obrigatória (proprietário ou admin)

**Parâmetros de URL:**

| Campo       | Tipo | Descrição     |
| ----------- | ---- | ------------- |
| `projectId` | UUID | ID do projeto |

---

#### 9.1. Adicionar Nota

Associa uma nota existente ao projeto. A nota deve pertencer ao usuário ou ter o usuário como colaborador.

**Corpo da Requisição:**

```json
{
  "action": "add",
  "noteId": "650e8400-e29b-41d4-a716-446655440005"
}
```

**Parâmetros:**

| Campo    | Tipo   | Obrigatório | Descrição                  |
| -------- | ------ | ----------- | -------------------------- |
| `action` | string | Sim         | Deve ser `"add"`           |
| `noteId` | UUID   | Sim         | ID da nota a ser associada |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Nota adicionada ao projeto com sucesso",
  "notes": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440005",
      "title": "Implementar testes unitários",
      "description": "Adicionar cobertura de testes",
      "tags": ["tests", "quality"],
      "status": "todo",
      "created_by": {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "joao.silva"
      },
      "created_at": "2024-11-25T10:00:00Z",
      "updated_at": "2024-11-25T10:00:00Z"
    }
  ]
}
```

**Observações:**

- A nota é adicionada ao array `associated_notes` do projeto
- O campo `project_id` da nota é atualizado para referenciar o projeto
- O `progress` do projeto é recalculado automaticamente
- Nota não pode estar já associada ao projeto

---

#### 9.2. Sincronizar Nota

Atualiza os dados de uma nota associada, sincronizando com as informações mais recentes da tabela `notes`.

**Corpo da Requisição:**

```json
{
  "action": "sync",
  "noteId": "650e8400-e29b-41d4-a716-446655440005"
}
```

**Parâmetros:**

| Campo    | Tipo   | Obrigatório | Descrição                     |
| -------- | ------ | ----------- | ----------------------------- |
| `action` | string | Sim         | Deve ser `"sync"`             |
| `noteId` | UUID   | Sim         | ID da nota a ser sincronizada |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Nota sincronizada com sucesso",
  "notes": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440005",
      "title": "Implementar testes unitários - Atualizado",
      "description": "Adicionar cobertura completa de testes",
      "tags": ["tests", "quality", "ci/cd"],
      "status": "doing",
      "created_by": {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "joao.silva"
      },
      "created_at": "2024-11-25T10:00:00Z",
      "updated_at": "2024-11-30T15:30:00Z"
    }
  ]
}
```

**Observações:**

- Útil quando a nota foi editada fora do contexto do projeto
- O `progress` do projeto é recalculado após sincronização

---

#### 9.3. Remover Nota

Remove a associação entre nota e projeto. A nota permanece na tabela `notes`, mas não é mais vinculada ao projeto.

**Corpo da Requisição:**

```json
{
  "action": "remove",
  "noteId": "650e8400-e29b-41d4-a716-446655440005"
}
```

**Parâmetros:**

| Campo    | Tipo   | Obrigatório | Descrição                 |
| -------- | ------ | ----------- | ------------------------- |
| `action` | string | Sim         | Deve ser `"remove"`       |
| `noteId` | UUID   | Sim         | ID da nota a ser removida |

**Resposta de Sucesso:** `200 OK`

```json
{
  "message": "Nota removida do projeto com sucesso"
}
```

**Observações:**

- A nota é removida do array `associated_notes`
- O campo `project_id` da nota é definido como `NULL`
- O `progress` do projeto é recalculado automaticamente
- A nota não é deletada, apenas desassociada

**Erros Possíveis (para todas as ações):**

- `400 Bad Request`: Ação inválida ou noteId não fornecido
- `401 Unauthorized`: Token de autenticação ausente ou inválido
- `404 Not Found`: Projeto ou nota não encontrados, ou usuário sem permissão

---

## Schema de Dados

### Schema de Properties

O campo `properties` em projetos aceita os seguintes atributos personalizáveis:

```typescript
{
  "priority": "alta" | "media" | "baixa",      // Prioridade do projeto
  "tags": string[],                            // Tags de categorização (ex: ["backend", "api"])
  "estimated_time": string,                    // Data estimada de conclusão (ISO 8601)
  "progress": number,                          // Progresso 0-100 (Calculado automaticamente, Read-Only)
  "complexity": "alta" | "media" | "baixa",    // Complexidade técnica
  "color": string,                             // Cor em hexadecimal (ex: "#ff5722")
  "icon": string                               // Emoji ou ícone (ex: "🚀")
}
```

**Exemplo Completo:**

```json
{
  "priority": "alta",
  "tags": ["backend", "api", "authentication"],
  "estimated_time": "2024-12-31T23:59:59Z",
  "progress": 75,
  "complexity": "alta",
  "color": "#ff5722",
  "icon": "🔐"
}
```

### Regras de Validação

| Campo            | Validação                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `priority`       | Deve ser `"alta"`, `"media"` ou `"baixa"`                                                    |
| `tags`           | Deve ser um array de strings                                                                 |
| `estimated_time` | Deve ser uma data válida no formato ISO 8601 (ex: `2024-12-31T23:59:59Z`)                    |
| `progress`       | **Somente leitura**. Calculado automaticamente com base no status das notas (`done` / total) |
| `complexity`     | Deve ser `"alta"`, `"media"` ou `"baixa"`                                                    |
| `color`          | Deve ser um código hexadecimal válido (ex: `#ff0000`, `#3f51b5`)                             |
| `icon`           | Aceita qualquer string (emojis, texto, etc.)                                                 |

**Observações Importantes:**

1. **`progress` é Read-Only**: Este campo é calculado automaticamente e não pode ser definido manualmente. Qualquer tentativa de setá-lo será ignorada.

2. **Merge de Properties**: Ao atualizar um projeto, as `properties` são mescladas (merge) com as existentes, não sobrescritas. Apenas os campos enviados são atualizados.

3. **Cálculo de Progress**:
   ```
   progress = (notas com status "done" / total de notas) × 100
   ```
   Arredondado para o inteiro mais próximo.

---

## Códigos de Status

### Respostas HTTP

| Código | Status                | Descrição                                                         |
| ------ | --------------------- | ----------------------------------------------------------------- |
| `200`  | OK                    | Requisição bem-sucedida                                           |
| `201`  | Created               | Recurso criado com sucesso                                        |
| `400`  | Bad Request           | Dados inválidos, campos obrigatórios ausentes ou validação falhou |
| `401`  | Unauthorized          | Token de autenticação ausente, inválido ou expirado               |
| `404`  | Not Found             | Recurso não encontrado ou usuário sem permissão de acesso         |
| `500`  | Internal Server Error | Erro interno do servidor                                          |

### Exemplos de Respostas de Erro

**400 Bad Request:**

```json
{
  "error": "Título é obrigatório"
}
```

**401 Unauthorized:**

```json
{
  "error": "Usuário não autenticado"
}
```

**404 Not Found:**

```json
{
  "error": "Projeto não encontrado"
}
```

---

## Notas Adicionais

### Permissões de Colaboradores

| Permissão | Descrição     | Ações Permitidas                                          |
| --------- | ------------- | --------------------------------------------------------- |
| `admin`   | Administrador | Gerenciar notas, visualizar projeto, editar configurações |
| `viewer`  | Visualizador  | Apenas visualizar projeto e notas                         |

**Observação:** Apenas o proprietário pode adicionar/remover colaboradores e deletar o projeto.

### Soft Delete

Projetos e colaboradores removidos não são excluídos fisicamente do banco de dados:

- **Projetos**: marcados com `deleted = true`
- **Colaboradores**: marcados com `removed = true` e `removed_at` preenchido

Isso permite auditoria e eventual recuperação de dados.

### Performance

- Queries otimizadas com JOINs para reduzir consultas ao banco
- Arrays JSONB (`collaborators`, `associated_notes`) para denormalização controlada
- Cálculos de `progress` executados no banco de dados via SQL

---

**Versão da Documentação:** 2.0  
**Última Atualização:** Dezembro de 2024
