# Weave Notes — Documentação Interna

Aplicação full-stack para gerenciamento de notas, projetos e colaboração e workspace organizacional.

**Deploy:** [https://weavenotes.app](https://weavenotes.app/)

---

## Stack

| Camada         | Tecnologia                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Next.js 15 (App Router), TypeScript, TailwindCSS |
| Backend        | Node.js 22+, Express.js 4, JavaScript/TypeScript |
| Banco de dados | PostgreSQL 16+                                   |
| Storage        | AWS S3 / DigitalOcean Spaces                     |
| IA             | Google Gemini (`@google/generative-ai`)        |
| Infra          | Docker, Docker Compose, Nginx                    |

---

## Monorepo

```
weave-notes/
├── server/   # API REST — Node.js/Express (porta 8080)
├── web/      # Frontend — Next.js 15 (porta 3000)
├── blog/     # Blog/Landing — Next.js 15 (porta 3001)
├── docker-compose.yml
└── docker-compose.override.yml  # Configurações locais (dev)
```

---

## Setup de Desenvolvimento

### Pré-requisitos

- Docker v20+
- Docker Compose v2+

### Iniciar ambiente

```bash
# Copiar variáveis de ambiente locais
cp docker-compose.override.example.yml docker-compose.override.yml

# Subir todos os serviços com hot-reload
docker compose up --build

# Ou apenas um serviço específico
docker compose up server --build
```

### Rodar sem Docker

```bash
cd server && npm run dev   # nodemon + ts-node
cd web && npm run dev      # Next.js dev server
cd blog && npm run dev     # Blog dev server
```

### Build de produção

```bash
cd server && npm run build  # Transpilação Babel (src/ → dist/)
cd web && npm run build     # Build estático Next.js
```

---

## Variáveis de Ambiente

Definidas no `docker-compose.override.yml` para desenvolvimento. Use o arquivo de exemplo como referência.

### Backend (`server/`)

| Variável                                               | Descrição                          |
| ------------------------------------------------------- | ------------------------------------ |
| `APP_PORT`                                            | Porta do servidor (padrão:`8080`) |
| `NODE_ENV`                                            | `development` / `production`     |
| `DATABASE_URL`                                        | Connection string PostgreSQL         |
| `JWT_SECRET`                                          | Chave para geração de tokens JWT   |
| `SESSION_SECRET`                                      | Chave da sessão Express             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`         | OAuth Google                         |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`       | S3 / DO Spaces                       |
| `AWS_BUCKET_NAME` / `AWS_REGION` / `AWS_ENDPOINT` | Storage                              |
| `GEMINI_API_KEY`                                      | Google Gemini AI                     |
| `SMTP_*`                                              | Configurações Nodemailer           |

### Frontend (`web/`)

| Variável               | Descrição                                        |
| ----------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | URL base da API (`http://server:8080` no Docker) |
| `NODE_ENV`            | `development` / `production`                   |

---

## Arquitetura do Backend

### Fluxo de request

```
Request → Routes → Middlewares → Controller → Repository → Database
```

### Estrutura de módulos

Cada feature em `src/modules/<feature>/`:

```
modules/notes/
├── notes.routes.js       # Express Router
├── notes.controller.js   # Lógica de negócio + respostas HTTP
└── notes.repository.js   # Queries SQL
```

### Módulos e rotas

| Módulo           | Prefixo                   |
| ----------------- | ------------------------- |
| `auth`          | `/api/v1/auth`          |
| `users`         | `/api/v1/users`         |
| `password`      | `/api/v1/password`      |
| `notes`         | `/api/v1/notes`         |
| `backup`        | `/api/v1/backup`        |
| `projects`      | `/api/v1/projects`      |
| `organizations` | `/api/v1/organizations` |
| `weave-ai`      | `/api/v1/weave-ai`      |
| `plans`         | `/api/v1/plans`         |
| Health check      | `GET /api/v1/health`    |

### Acesso ao banco

Sempre usar `executeQuery` / `rowCount` do pool centralizado com queries parametrizadas:

```javascript
const { executeQuery, rowCount } = require('@/services/db/index');

const results = await executeQuery(
  'SELECT * FROM notes WHERE user_id = $1 AND status = $2',
  [userId, 'open']
);
```

### Path aliases

Use `@/` para todos os imports internos (via `module-alias`):

```javascript
const { pool } = require('@/services/db/index');
```

### Autenticação

- JWT em cookie `HttpOnly`
- `req.user.userId` disponível em rotas protegidas após middleware de auth
- CORS e domínio de cookie configurados em `src/config/allowed-origins.js`

### Tratamento de erros

Handler global em `src/middlewares/error-handler.js`. Controllers lançam erros descritivos; respostas seguem o formato `{ "error": "mensagem" }`.

---

## Arquitetura do Frontend

### Sistema de contexts

```
AuthContext → ConditionalProviders → AuthenticatedProviders
```

Contexts que dependem de auth (Notes, Projects, Organizations, Chat) só são montados após login. Ver [web/app/contexts/ConditionalProviders.tsx](web/app/contexts/ConditionalProviders.tsx).

### API client

Centralizado em `app/services/api-methods.ts`. Todas as requests incluem `credentials: 'include'`.

```typescript
import { ApiClient, API_ENDPOINTS } from '@/services';
const response = await ApiClient.get(API_ENDPOINTS.NOTES);
```

### Rotas

| Tipo       | Caminho                                       |
| ---------- | --------------------------------------------- |
| Públicas  | `app/auth/*`, `app/about/`, `app/home/` |
| Protegidas | `app/app/*`                                 |

---

## Banco de Dados

Documentação completa em [server/db_docs/readme.md](server/db_docs/readme.md).

### Principais tabelas

| Tabela                                       | Descrição                    |
| -------------------------------------------- | ------------------------------ |
| `users`                                    | Cadastro e perfis              |
| `notes`                                    | Notas dos usuários            |
| `notes_blocks`                             | Blocos de conteúdo das notas  |
| `notes_collaborators`                      | Colaboração em notas         |
| `projects` / `projects_members`          | Projetos e membros             |
| `organizations` / `organization_members` | Organizações                 |
| `tokens`                                   | Verificação / reset de senha |
| `user_logs`                                | Logs de atividade              |

### Tipos ENUM

| Tipo                   | Valores                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `user_role`          | `admin`, `super_admin`, `member`, `guest`                                                           |
| `token_type_enum`    | `password_reset`, `email_verification`, `access`, `delete_user_account`                             |
| `theme_mode_pattern` | `dark`, `light`                                                                                         |
| `user_log_category`  | `auth_login`, `auth_logout`, `profile_update`, `security_change`, `data_export`, `system_error` |

### Convenções SQL

- IDs `bigint` convertidos para `text` nas queries: `id::text`
- Tags armazenadas como `text[]`

---

## Hot-Reload (Docker Compose Watch)

| Ação      | Gatilho                                                   |
| ----------- | --------------------------------------------------------- |
| `sync`    | Mudanças em `src/` — sincroniza arquivos no container |
| `rebuild` | Mudanças em `package.json` — faz rebuild da imagem    |

---

## Documentação

DESATUALIZADO

| Arquivo                                                                     | Conteúdo                                  |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| [server/docs/general.md](server/docs/general.md)                               | Middlewares, configurações, entry points |
| [server/docs/routes.md](server/docs/routes.md)                                 | Endpoints da API com exemplos              |
| [server/docs/notes.md](server/docs/notes.md)                                   | Módulo de notas                           |
| [server/docs/authentication.md](server/docs/authentication.md)                 | Fluxo de autenticação                    |
| [server/docs/projects-api.md](server/docs/projects-api.md)                     | API de projetos                            |
| [server/docs/AI_CHAT_IMPLEMENTATION.md](server/docs/AI_CHAT_IMPLEMENTATION.md) | Integração Gemini                        |
| [server/db_docs/readme.md](server/db_docs/readme.md)                           | Schema completo do banco                   |

---

## Funcionalidades atuais

- CRUD de notas com sistema de blocos (texto, código, parágrafo, lista...)
- Drag-and-drop de blocos
- Pesquisa e filtros de notas
- Colaboração em notas entre usuários (`notes_collaborators`)
- Projetos com gestão de membros
- Organizações com papéis (`admin`, `member`, `guest`)
- Chat com IA via Gemini (Weave AI)
- Export/backup de dados
- Google OAuth 2.0 (produção pendente de autorização Google)
- Recuperação de senha e verificação de email
- Temas claro/escuro
