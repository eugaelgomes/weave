# Documentação de Rotas - API

## Visão Geral

Todas as rotas da API são prefixadas com `/api`. Este documento descreve todos os endpoints disponíveis, seus métodos HTTP, parâmetros, autenticação e respostas esperadas.

**Base URL:** `http://localhost:8080/api` (desenvolvimento)

---

## 📋 Índice

1. [Autenticação (`/auth`)](#1-autenticação-auth)
2. [Usuários (`/users`)](#2-usuários-users)
3. [Recuperação de Senha (`/password`)](#3-recuperação-de-senha-password)
4. [Notas (`/notes`)](#4-notas-notes)
5. [Backup (`/backup`)](#5-backup-backup)

---

## 1. Autenticação (`/auth`)

### 1.1 Login com Email e Senha

**Endpoint:** `POST /api/auth/signin`

**Descrição:** Autentica usuário com email/username e senha.

**Autenticação:** Não requerida

**Middlewares:**
- `loginLimiter`: Rate limiting para proteção contra força bruta
- Validação e sanitização de entrada

**Body:**
```json
{
  "username": "usuario@email.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "usuario@email.com",
    "name": "Nome do Usuário"
  }
}
```

**Erros Possíveis:**
- `400`: Dados inválidos
- `401`: Credenciais incorretas
- `429`: Rate limit excedido

---

### 1.2 Iniciar Login com Google OAuth

**Endpoint:** `GET /api/auth/signin/sso/google`

**Descrição:** Inicia o fluxo de autenticação OAuth 2.0 com Google.

**Autenticação:** Não requerida

**Resposta:** Redireciona para página de consentimento do Google

---

### 1.3 Callback Google OAuth

**Endpoint:** `GET /api/auth/signin/sso/google/callback`

**Descrição:** Endpoint de callback para processar resposta do Google OAuth.

**Autenticação:** Não requerida

**Query Parameters:**
- `code`: Código de autorização do Google

**Resposta:** Redireciona para frontend com token JWT

---

### 1.4 Obter Perfil do Usuário

**Endpoint:** `GET /api/auth/me`

**Descrição:** Retorna informações do usuário autenticado.

**Autenticação:** ✅ Requerida (Bearer Token)

**Resposta de Sucesso (200):**
```json
{
  "id": "uuid",
  "username": "usuario@email.com",
  "name": "Nome do Usuário",
  "profileImage": "https://url-imagem.com/profile.jpg",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

---

### 1.5 Atualizar Perfil

**Endpoint:** `PUT /api/auth/me/update-profile`

**Descrição:** Atualiza informações do perfil do usuário, incluindo imagem.

**Autenticação:** ✅ Requerida

**Content-Type:** `multipart/form-data`

**Middlewares:**
- `upload.single("profilePicture")`: Upload de imagem
- `validateImage`: Validação de tamanho e formato

**Body (FormData):**
```
name: "Novo Nome"
profilePicture: [arquivo de imagem]
```

**Formatos Aceitos:** JPEG, PNG, WebP, GIF  
**Tamanho Máximo:** Configurável no middleware

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "user": {
    "id": "uuid",
    "name": "Novo Nome",
    "profileImage": "https://url-nova-imagem.com/profile.jpg"
  }
}
```

---

### 1.6 Logout

**Endpoint:** `POST /api/auth/logout`

**Descrição:** Invalida o token JWT e encerra a sessão.

**Autenticação:** ✅ Requerida

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

### 1.7 Renovar Token

**Endpoint:** `POST /api/auth/refresh`

**Descrição:** Gera um novo token JWT a partir de um refresh token.

**Autenticação:** Não requerida (usa refresh token)

**Body:**
```json
{
  "refreshToken": "refresh_token_aqui"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "token": "novo_token_jwt",
  "refreshToken": "novo_refresh_token"
}
```

---

## 2. Usuários (`/users`)

### 2.1 Criar Conta

**Endpoint:** `POST /api/users/create-account`

**Descrição:** Registra um novo usuário na plataforma.

**Autenticação:** Não requerida

**Content-Type:** `multipart/form-data`

**Middlewares:**
- `upload.single("profileImage")`: Upload opcional de imagem de perfil
- `validateCompressedImageSize`: Validação de imagem
- `dataValidator()`: Validação de dados

**Body (FormData):**
```
username: "usuario@email.com"
password: "senha_segura123"
name: "Nome do Usuário"
profileImage: [arquivo opcional]
```

**Validações:**
- Email válido e único
- Senha mínima de 8 caracteres
- Nome obrigatório

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "userId": "uuid",
  "token": "jwt_token"
}
```

**Erros Possíveis:**
- `400`: Dados inválidos ou email já cadastrado
- `413`: Imagem muito grande

---

### 2.2 Buscar Usuários (para Colaboração)

**Endpoint:** `GET /api/users/search`

**Descrição:** Busca usuários para adicionar como colaboradores em notas.

**Autenticação:** ✅ Requerida

**Query Parameters:**
- `q`: Termo de busca (nome ou email)
- `limit`: Número máximo de resultados (padrão: 10)

**Exemplo:** `GET /api/users/search?q=maria&limit=5`

**Resposta de Sucesso (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "username": "maria@email.com",
      "profileImage": "https://url-imagem.com/profile.jpg"
    }
  ]
}
```

---

### 2.3 Obter Imagem de Perfil

**Endpoint:** `GET /api/users/my-profile-image`

**Descrição:** Retorna a imagem de perfil do usuário autenticado.

**Autenticação:** ✅ Requerida

**Resposta de Sucesso (200):**
- Content-Type: `image/jpeg`, `image/png`, etc.
- Body: Arquivo binário da imagem

---

### 2.4 Obter Informações da Imagem de Perfil

**Endpoint:** `GET /api/users/my-profile-image-info`

**Descrição:** Retorna metadados da imagem de perfil (URL, tamanho, etc.).

**Autenticação:** ✅ Requerida

**Resposta de Sucesso (200):**
```json
{
  "url": "https://spaces.digitalocean.com/bucket/profile.jpg",
  "size": 245678,
  "uploadedAt": "2025-01-15T10:30:00Z"
}
```

---

### 2.5 Deletar Conta

**Endpoint:** `DELETE /api/users/delete-my-account`

**Descrição:** Deleta permanentemente a conta do usuário autenticado.

**Autenticação:** ✅ Requerida

**Ação:** 
- Remove todos os dados do usuário
- Deleta notas criadas
- Remove colaborações
- Envia email de confirmação

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Conta deletada com sucesso"
}
```

**Nota:** Esta ação é **irreversível**.

---

## 3. Recuperação de Senha (`/password`)

### 3.1 Solicitar Recuperação de Senha

**Endpoint:** `POST /api/password/forgot-password`

**Descrição:** Inicia processo de recuperação de senha enviando email com token.

**Autenticação:** Não requerida

**Body:**
```json
{
  "email": "usuario@email.com"
}
```

**Validação:**
- Email válido

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Email de recuperação enviado com sucesso"
}
```

**Comportamento:**
- Envia email com link de reset
- Token expira em 1 hora
- Retorna sucesso mesmo se email não existir (segurança)

---

### 3.2 Resetar Senha

**Endpoint:** `POST /api/password/reset-password`

**Descrição:** Redefine a senha usando token recebido por email.

**Autenticação:** Não requerida

**Body:**
```json
{
  "token": "token_recebido_por_email",
  "newPassword": "nova_senha_segura123"
}
```

**Validações:**
- Token válido e não expirado
- Senha mínima de 8 caracteres

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso"
}
```

**Erros Possíveis:**
- `400`: Token inválido ou expirado
- `400`: Senha não atende critérios de segurança

---

## 4. Notas (`/notes`)

**Autenticação:** ✅ Todas as rotas requerem autenticação

### 4.1 Listar Todas as Notas

**Endpoint:** `GET /api/notes`

**Descrição:** Retorna todas as notas do usuário autenticado (criadas e compartilhadas).

**Query Parameters:**
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 20)
- `sort`: Ordenação (`createdAt`, `updatedAt`, `title`)
- `order`: Direção (`asc`, `desc`)

**Exemplo:** `GET /api/notes?page=1&limit=10&sort=updatedAt&order=desc`

**Resposta de Sucesso (200):**
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Minha Nota",
      "content": "Conteúdo...",
      "ownerId": "uuid",
      "isOwner": true,
      "collaborators": 2,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 4.2 Obter Nota por ID

**Endpoint:** `GET /api/notes/:id`

**Descrição:** Retorna detalhes de uma nota específica.

**Parâmetros:**
- `id`: ID da nota (UUID)

**Resposta de Sucesso (200):**
```json
{
  "id": "uuid",
  "title": "Título da Nota",
  "content": "Conteúdo principal",
  "ownerId": "uuid",
  "ownerName": "Nome do Dono",
  "isOwner": true,
  "blocks": [
    {
      "id": "uuid",
      "type": "text",
      "content": "Conteúdo do bloco",
      "order": 1
    }
  ],
  "collaborators": [
    {
      "id": "uuid",
      "name": "Colaborador",
      "username": "email@example.com"
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T14:20:00Z"
}
```

**Erros Possíveis:**
- `404`: Nota não encontrada
- `403`: Usuário não tem permissão para acessar

---

### 4.3 Criar Nova Nota

**Endpoint:** `POST /api/notes`

**Descrição:** Cria uma nova nota básica (sem blocos iniciais).

**Body:**
```json
{
  "title": "Nova Nota",
  "content": "Descrição inicial"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "noteId": "uuid",
  "message": "Nota criada com sucesso"
}
```

---

### 4.4 Criar Nota Completa

**Endpoint:** `POST /api/notes/complete`

**Descrição:** Cria uma nota com bloco inicial de conteúdo.

**Body:**
```json
{
  "title": "Nova Nota Completa",
  "content": "Descrição da nota",
  "initialBlock": {
    "type": "text",
    "content": "Primeiro bloco de conteúdo"
  }
}
```

**Tipos de Bloco:** `text`, `image`, `list`, `code`, `quote`

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "noteId": "uuid",
  "blockId": "uuid",
  "message": "Nota criada com sucesso"
}
```

---

### 4.5 Atualizar Nota

**Endpoint:** `PUT /api/notes/:id`

**Descrição:** Atualiza informações básicas da nota (título e conteúdo).

**Parâmetros:**
- `id`: ID da nota

**Body:**
```json
{
  "title": "Título Atualizado",
  "content": "Conteúdo atualizado"
}
```

**Permissão:** Apenas o dono pode atualizar

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Nota atualizada com sucesso"
}
```

---

### 4.6 Deletar Nota

**Endpoint:** `DELETE /api/notes/:id`

**Descrição:** Deleta uma nota e todos os seus blocos e colaborações.

**Parâmetros:**
- `id`: ID da nota

**Permissão:** Apenas o dono pode deletar

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Nota deletada com sucesso"
}
```

**Erros Possíveis:**
- `404`: Nota não encontrada
- `403`: Apenas o dono pode deletar

---

## 4.7 Gerenciamento de Blocos

### 4.7.1 Listar Blocos da Nota

**Endpoint:** `GET /api/notes/:noteId/blocks`

**Descrição:** Retorna todos os blocos de uma nota ordenados.

**Parâmetros:**
- `noteId`: ID da nota

**Resposta de Sucesso (200):**
```json
{
  "blocks": [
    {
      "id": "uuid",
      "noteId": "uuid",
      "type": "text",
      "content": "Conteúdo do bloco",
      "order": 1,
      "createdAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "noteId": "uuid",
      "type": "image",
      "content": "https://url-imagem.com/img.jpg",
      "order": 2,
      "createdAt": "2025-01-15T10:32:00Z"
    }
  ]
}
```

---

### 4.7.2 Criar Bloco

**Endpoint:** `POST /api/notes/:id/blocks`

**Descrição:** Adiciona um novo bloco à nota.

**Parâmetros:**
- `id`: ID da nota

**Body:**
```json
{
  "type": "text",
  "content": "Conteúdo do novo bloco",
  "order": 3
}
```

**Tipos Disponíveis:**
- `text`: Texto simples
- `image`: URL de imagem
- `list`: Lista de itens
- `code`: Código com syntax highlighting
- `quote`: Citação

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "blockId": "uuid",
  "message": "Bloco criado com sucesso"
}
```

---

### 4.7.3 Atualizar Bloco

**Endpoint:** `PUT /api/notes/:noteId/blocks/:blockId`

**Descrição:** Atualiza conteúdo de um bloco específico.

**Parâmetros:**
- `noteId`: ID da nota
- `blockId`: ID do bloco

**Body:**
```json
{
  "type": "text",
  "content": "Conteúdo atualizado"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Bloco atualizado com sucesso"
}
```

---

### 4.7.4 Deletar Bloco

**Endpoint:** `DELETE /api/notes/:noteId/blocks/:blockId`

**Descrição:** Remove um bloco da nota.

**Parâmetros:**
- `noteId`: ID da nota
- `blockId`: ID do bloco

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Bloco deletado com sucesso"
}
```

---

### 4.7.5 Reordenar Blocos

**Endpoint:** `PUT /api/notes/:noteId/blocks/reorder`

**Descrição:** Reordena os blocos da nota.

**Parâmetros:**
- `noteId`: ID da nota

**Body:**
```json
{
  "blocks": [
    { "id": "uuid-1", "order": 1 },
    { "id": "uuid-2", "order": 2 },
    { "id": "uuid-3", "order": 3 }
  ]
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Blocos reordenados com sucesso"
}
```

---

## 4.8 Gerenciamento de Colaboradores

### 4.8.1 Listar Colaboradores

**Endpoint:** `GET /api/notes/:noteId/collaborators`

**Descrição:** Lista todos os colaboradores de uma nota.

**Parâmetros:**
- `noteId`: ID da nota

**Resposta de Sucesso (200):**
```json
{
  "collaborators": [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "username": "maria@email.com",
      "profileImage": "https://url.com/profile.jpg",
      "addedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4.8.2 Adicionar Colaborador

**Endpoint:** `POST /api/notes/:noteId/collaborators`

**Descrição:** Adiciona um colaborador à nota e envia notificação por email.

**Parâmetros:**
- `noteId`: ID da nota

**Body:**
```json
{
  "userId": "uuid-do-colaborador"
}
```

**Permissão:** Apenas o dono pode adicionar colaboradores

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Colaborador adicionado com sucesso"
}
```

**Erros Possíveis:**
- `400`: Colaborador já existe na nota
- `403`: Apenas o dono pode adicionar colaboradores
- `404`: Usuário não encontrado

---

### 4.8.3 Recusar Colaboração (Auto-Remoção)

**Endpoint:** `PUT /api/notes/:noteId/recuseCollaboration`

**Descrição:** Permite que um colaborador se remova da nota.

**Parâmetros:**
- `noteId`: ID da nota

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Você foi removido da nota"
}
```

**Nota:** Colaborador pode se remover, mas não pode remover outros.

---

### 4.8.4 Remover Colaborador

**Endpoint:** `DELETE /api/notes/:noteId/collaborators/:collaboratorId`

**Descrição:** Remove um colaborador da nota.

**Parâmetros:**
- `noteId`: ID da nota
- `collaboratorId`: ID do colaborador a ser removido

**Permissão:** Apenas o dono pode remover colaboradores

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Colaborador removido com sucesso"
}
```

**Erros Possíveis:**
- `403`: Apenas o dono pode remover colaboradores
- `404`: Colaborador não encontrado na nota

---

## 5. Backup (`/backup`)

**Autenticação:** ✅ Todas as rotas requerem autenticação

### 5.1 Solicitar Backup

**Endpoint:** `POST /api/backup/request`

**Descrição:** Inicia um job assíncrono para exportar todos os dados do usuário.

**Resposta de Sucesso (202):**
```json
{
  "success": true,
  "jobId": "backup_1234567890_abc123",
  "message": "Backup iniciado. Use o jobId para verificar o status."
}
```

**Processo:**
1. Cria job assíncrono
2. Exporta notas, blocos e dados do usuário
3. Gera arquivo JSON
4. Envia email quando concluído

---

### 5.2 Verificar Status do Backup

**Endpoint:** `GET /api/backup/status/:jobId`

**Descrição:** Consulta o status de um job de backup.

**Parâmetros:**
- `jobId`: ID do job retornado ao solicitar backup

**Resposta de Sucesso (200):**
```json
{
  "job": {
    "id": "backup_1234567890_abc123",
    "status": "completed",
    "progress": 100,
    "createdAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:32:00Z",
    "result": {
      "fileUrl": "https://spaces.digitalocean.com/backup.json",
      "expiresAt": "2025-01-16T10:32:00Z"
    }
  }
}
```

**Status Possíveis:**
- `pending`: Aguardando processamento
- `processing`: Em execução
- `completed`: Finalizado com sucesso
- `failed`: Falhou (com erro)

---

### 5.3 Listar Jobs de Backup

**Endpoint:** `GET /api/backup/jobs`

**Descrição:** Lista todos os jobs de backup do usuário.

**Query Parameters:**
- `limit`: Número de resultados (padrão: 10)

**Resposta de Sucesso (200):**
```json
{
  "jobs": [
    {
      "id": "backup_1234567890_abc123",
      "status": "completed",
      "createdAt": "2025-01-15T10:30:00Z",
      "completedAt": "2025-01-15T10:32:00Z"
    },
    {
      "id": "backup_1234567789_xyz456",
      "status": "processing",
      "progress": 45,
      "createdAt": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

### 5.4 Obter Resumo dos Dados

**Endpoint:** `GET /api/backup/summary`

**Descrição:** Retorna resumo estatístico dos dados do usuário para backup.

**Resposta de Sucesso (200):**
```json
{
  "summary": {
    "totalNotes": 15,
    "totalBlocks": 87,
    "totalCollaborations": 3,
    "accountCreatedAt": "2024-06-10T08:15:00Z",
    "lastBackup": "2025-01-10T14:20:00Z"
  }
}
```

---

## 📊 Códigos de Status HTTP

### Sucesso
- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `202 Accepted`: Requisição aceita para processamento assíncrono

### Erro do Cliente
- `400 Bad Request`: Dados inválidos ou malformados
- `401 Unauthorized`: Token ausente ou inválido
- `403 Forbidden`: Sem permissão para acessar recurso
- `404 Not Found`: Recurso não encontrado
- `413 Payload Too Large`: Arquivo muito grande
- `429 Too Many Requests`: Rate limit excedido

### Erro do Servidor
- `500 Internal Server Error`: Erro interno do servidor
- `503 Service Unavailable`: Serviço temporariamente indisponível

---

## 🔐 Autenticação

### Formato do Token JWT

**Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Estrutura do Token
```json
{
  "userId": "uuid",
  "username": "usuario@email.com",
  "iat": 1705320000,
  "exp": 1705920000
}
```

### Expiração
- **Access Token**: 7 dias (configurável)
- **Refresh Token**: 30 dias

---

## 🛡️ Segurança

### Rate Limiting

**Limites Globais:**
- 100 requisições por 15 minutos (por IP)

**Limites Específicos:**
- Login: 5 tentativas por 15 minutos
- Criar conta: 3 tentativas por hora
- Recuperação de senha: 3 tentativas por hora

### Validações

**Senhas:**
- Mínimo 8 caracteres
- Armazenadas com bcrypt (10 rounds)

**Imagens:**
- Formatos: JPEG, PNG, WebP, GIF
- Tamanho máximo: 5MB (antes da compressão)
- Compressão automática aplicada

**Emails:**
- Validação de formato RFC 5322
- Sanitização contra XSS

---

## 📝 Exemplos de Uso

### Autenticar e Criar Nota

```bash
# 1. Login
curl -X POST http://localhost:8080/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"user@email.com","password":"senha123"}'

# Resposta: { "token": "eyJ..." }

# 2. Criar nota completa
curl -X POST http://localhost:8080/api/notes/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{
    "title": "Minha Primeira Nota",
    "content": "Descrição da nota",
    "initialBlock": {
      "type": "text",
      "content": "Primeiro parágrafo"
    }
  }'
```

### Upload de Imagem de Perfil

```bash
curl -X PUT http://localhost:8080/api/auth/me/update-profile \
  -H "Authorization: Bearer eyJ..." \
  -F "name=João Silva" \
  -F "profilePicture=@/path/to/image.jpg"
```

### Adicionar Colaborador

```bash
# 1. Buscar usuário
curl -X GET "http://localhost:8080/api/users/search?q=maria" \
  -H "Authorization: Bearer eyJ..."

# 2. Adicionar à nota
curl -X POST http://localhost:8080/api/notes/{noteId}/collaborators \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{"userId":"uuid-do-usuario"}'
```

---

## 🔄 Webhooks e Notificações

### Emails Enviados Automaticamente

1. **Boas-vindas**: Ao criar conta
2. **Recuperação de senha**: Ao solicitar reset
3. **Adicionado como colaborador**: Ao ser adicionado em nota
4. **Backup pronto**: Quando backup é concluído
5. **Exclusão de conta**: Ao deletar conta

---

## 📌 Notas Importantes

1. **IDs são UUIDs**: Todos os IDs de recursos são UUIDs v4
2. **Timestamps em ISO 8601**: Formato `2025-01-15T10:30:00Z`
3. **Paginação**: Limite padrão de 20 itens por página
4. **CORS**: Origens permitidas configuradas via `.env`
5. **Sessões**: Armazenadas no PostgreSQL via `connect-pg-simple`

---

## 🚀 Próximas Funcionalidades (Roadmap)

- [ ] WebSocket para colaboração em tempo real
- [ ] Versionamento de notas
- [ ] Tags e categorias
- [ ] Busca full-text
- [ ] Exportação em Markdown/PDF
- [ ] API GraphQL alternativa

---

*Documentação atualizada em: Novembro de 2025*
