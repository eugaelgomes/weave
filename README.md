# Weave Notes — Documentação Interna

Aplicação full-stack para gerenciamento de notas, projetos e colaboração organizacional com console administrativo.

**Deploy:** [https://weavenotes.app](https://weavenotes.app/)

---

## Índice

- [Stack](#stack)
- [Monorepo](#monorepo)
- [Setup de Desenvolvimento](#setup-de-desenvolvimento)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Convenções de Código](#convenções-de-código)
- [Arquitetura do Backend](#arquitetura-do-backend)
- [Arquitetura do Frontend](#arquitetura-do-frontend)
- [Banco de Dados](#banco-de-dados)
- [Portas dos Serviços](#portas-dos-serviços)
- [Hot-Reload](#hot-reload-docker-compose-watch)
- [Troubleshooting](#troubleshooting)
- [Documentação](#documentação)
- [Funcionalidades](#funcionalidades)
- [Principais Dependências](#principais-dependências)
- [Licença](#licença)
- [Autor](#autor)

---

## Stack

| Camada         | Tecnologia                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), TypeScript, TailwindCSS  |
| Backend        | Node.js 22+, Express.js 4, JavaScript/TypeScript  |
| Banco de dados | PostgreSQL 16+                                    |
| Storage        | AWS S3 / DigitalOcean Spaces                      |
| IA             | Google Gemini (`@google/generative-ai`)         |
| Infra          | Docker, Docker Compose, Nginx                     |

---

## Monorepo

```
weave-notes/
├── server/        # API REST — Node.js/Express (porta 8080)
├── web/           # Frontend — Next.js 16 (porta 3000)
├── blog/          # Blog/Landing — Next.js 16 (porta 3001)
├── admin-console/ # Console Administrativo — Next.js 16 (porta 3003)
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
cp docker-compose.override.example.yml docker-compose.override.yml

docker compose up --build

docker compose up server --build
docker compose up web --build
docker compose up blog --build
docker compose up admin-console --build
```

### Rodar sem Docker

```bash
cd server && npm run dev         # nodemon + ts-node (porta 8080)
cd web && npm run dev            # Next.js dev server (porta 3000)
cd blog && npm run dev           # Blog dev server (porta 3001)
cd admin-console && npm run dev  # Admin console (porta 3003)
```

### Build de produção

```bash
cd server && npm run build        # Transpilação Babel (src/ → dist/)
cd web && npm run build           # Build estático Next.js
cd blog && npm run build          # Blog build
cd admin-console && npm run build # Admin console build
```

### Comandos úteis

```bash
# Testes (backend)
cd server && npm test

# Linting e formatação
cd web && npm run lint           # ESLint
cd web && npm run lint:fix       # Corrigir problemas automaticamente
cd web && npm run format         # Prettier
cd web && npm run format:check   # Verificar formatação

# Docker
docker compose down              # Parar todos os serviços
docker compose logs server       # Ver logs do backend
docker compose logs -f web       # Seguir logs do frontend
docker compose restart server    # Reiniciar serviço específico
docker system prune -a           # Limpar imagens não utilizadas

# Banco de dados
docker compose exec db psql -U postgres -d weavenotes  # Acessar PostgreSQL
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

### Blog (`blog/`)

| Variável                 | Descrição                              |
| ------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_APP_URL`   | URL da aplicação principal (web)      |
| `NEXT_PUBLIC_BLOG_URL`  | URL do blog                            |
| `NODE_ENV`              | `development` / `production`         |

### Console Administrativo (`admin-console/`)

| Variável                 | Descrição                              |
| ------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | URL base da API                        |
| `NEXT_PUBLIC_APP_URL`   | URL do console administrativo          |
| `NODE_ENV`              | `development` / `production`         |

---

## Convenções de Código

### Backend (`server/`)

- **Módulos**: CommonJS (`require`/`module.exports`) para `.js`, ES6 imports para `.ts`
- **Path aliases**: Use `@/` para imports internos (ex: `@/services/db`)
- **Nomenclatura de arquivos**: kebab-case (ex: `auth-controller.js`)
- **Nomenclatura de classes**: PascalCase (ex: `AuthController`)
- **Nomenclatura de métodos**: camelCase (ex: `getUserById`)
- **Métodos privados**: Prefixo `_` (ex: `_validateAuthentication`)
- **Queries SQL**: Sempre usar parâmetros (`$1`, `$2`, ...) - nunca concatenar strings

### Frontend (`web/`, `blog/`, `admin-console/`)

- **Módulos**: ES6 modules (`import`/`export`) exclusivamente
- **Componentes**: PascalCase (ex: `NoteCard.tsx`)
- **Hooks customizados**: Prefixo `use` (ex: `useNotes.ts`)
- **Tipos**: PascalCase em arquivos `.d.ts` (ex: `User`, `Note`)
- **Estilos**: TailwindCSS utility classes
- **Formatação**: Prettier (executar `npm run format` antes do commit)

### Padrões gerais

- **Commits**: Mensagens descritivas em português
- **Branches**: `feature/`, `bugfix/`, `hotfix/`, `release/`
- **Respostas de erro**: Formato `{ "error": "mensagem" }`
- **IDs**: Sempre converter `bigint` para string nas queries (`id::text`)

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

| Módulo           | Prefixo                   | Descrição                          |
| ----------------- | ------------------------- | ------------------------------------ |
| `auth`          | `/api/v1/auth`          | Autenticação de usuários          |
| `users`         | `/api/v1/users`         | Gestão de usuários                |
| `password`      | `/api/v1/password`      | Recuperação de senha              |
| `notes`         | `/api/v1/notes`         | CRUD de notas e colaboração       |
| `backup`        | `/api/v1/backup`        | Backup e exportação de dados      |
| `projects`      | `/api/v1/projects`      | Projetos e membros                 |
| `organizations` | `/api/v1/organizations` | Organizações                      |
| `weave-ai`      | `/api/v1/weave-ai`      | Chat com IA (Gemini)               |
| `plans`         | `/api/v1/plans`         | Planos e assinaturas              |
| `admin`         | `/api/v1/admin`         | Painel administrativo              |
| `system-auth`   | `/api/v1/system-auth`   | Autenticação de super admins      |
| `system-admins` | `/api/v1/system-admins` | Gestão de administradores         |
| Health check      | `GET /api/v1/health`    | Verificação de saúde da API      |

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

### Contextos disponíveis

| Contexto              | Caminho                                      | Descrição                              |
| --------------------- | -------------------------------------------- | ---------------------------------------- |
| `AuthContext`       | `web/app/contexts/AuthContext.tsx`         | Autenticação e dados do usuário       |
| `NotesContext`      | `web/app/contexts/NotesContext.tsx`        | Estado global de notas                  |
| `ProjectsContext`   | `web/app/contexts/ProjectsContext.tsx`     | Gestão de projetos                     |
| `OrganizationsContext` | `web/app/contexts/OrganizationsContext.tsx` | Organizações e membros               |
| `ChatContext`       | `web/app/contexts/ChatContext.tsx`         | Chat com IA                             |
| `DashboardContext`  | `admin-console/app/contexts/dashboardContext.tsx` | Métricas admin (console)         |
| `PlansContext`      | `admin-console/app/contexts/plansContext.tsx` | Planos (console)                      |

### Rotas

#### Web (`web/`)

| Tipo       | Caminho                                           | Descrição                        |
| ---------- | ------------------------------------------------- | ---------------------------------- |
| Públicas  | `app/auth/*`                                    | Login, registro, OAuth             |
|            | `app/about/*`                                   | Sobre a aplicação                |
|            | `app/home/`                                     | Página inicial pública           |
| Protegidas | `app/app/notes/*`                               | Interface de notas                 |
|            | `app/app/projects/*`                            | Gestão de projetos                |
|            | `app/app/organizations/*`                       | Organizações                      |
|            | `app/app/settings/*`                            | Configurações do usuário        |
|            | `app/app/weave-ai/*`                            | Chat com IA                        |

#### Admin Console (`admin-console/`)

| Tipo       | Caminho           | Descrição                   |
| ---------- | ----------------- | ----------------------------- |
| Pública   | `app/signin`    | Login de administradores      |
| Protegidas | `app/`          | Dashboard principal           |
|            | `app/users`     | Gestão de usuários          |
|            | `app/plans/*`   | Gestão de planos            |

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
| `system_users_roles` | `super_admin`, `admin`, `moderator`, `support`                                                      |
| `token_type_enum`    | `password_reset`, `email_verification`, `access`, `delete_user_account`                             |
| `theme_mode_pattern` | `dark`, `light`                                                                                         |
| `user_log_category`  | `auth_login`, `auth_logout`, `profile_update`, `security_change`, `data_export`, `system_error` |

### Convenções SQL

- IDs `bigint` convertidos para `text` nas queries: `id::text`
- Tags armazenadas como `text[]`

---

## Portas dos Serviços

| Serviço         | Porta Local | Descrição                      |
| --------------- | ----------- | -------------------------------- |
| `server`      | 8080        | API REST backend                 |
| `web`         | 3000        | Frontend principal               |
| `blog`        | 3001        | Blog e landing page              |
| `admin-console` | 3003        | Console administrativo           |

---

## Hot-Reload (Docker Compose Watch)

O ambiente de desenvolvimento usa Docker Compose Watch para recarregar automaticamente:

| Ação      | Gatilho                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| `sync`    | Mudanças em arquivos de código — sincroniza arquivos no container       |
| `rebuild` | Mudanças em `package.json` — reconstrói a imagem do container           |

**Pastas sincronizadas:**
- `server/src/` → Código backend
- `web/app/` → Código frontend
- `blog/app/` → Código do blog
- `admin-console/app/` → Código do console admin

---

## Troubleshooting

### Problemas comuns

**Container não inicia / porta já em uso**
```bash
# Verificar portas em uso
lsof -i :8080  # Backend
lsof -i :3000  # Web
lsof -i :3001  # Blog
lsof -i :3003  # Admin console

# Parar todos os containers
docker compose down
```

**Mudanças não refletem no container**
```bash
# Forçar rebuild
docker compose up --build

# Limpar volumes e rebuild
docker compose down -v
docker compose up --build
```

**Erro de conexão com banco de dados**
- Verificar se o serviço `db` está rodando: `docker compose ps`
- Verificar variável `DATABASE_URL` no `docker-compose.override.yml`
- Verificar logs: `docker compose logs db`

**Módulo não encontrado (Module not found)**
- Backend: Verificar path alias `@/` configurado em `module-alias`
- Frontend: Limpar build cache: `rm -rf .next && npm run dev`

**CORS errors no frontend**
- Verificar `NEXT_PUBLIC_API_URL` está correto
- Verificar domínios permitidos em `server/src/config/allowed-origins.js`
- Verificar se cookies estão sendo enviados: `credentials: 'include'`

**Hot reload não funciona**
- Verificar se as pastas corretas estão sendo sincronizadas no `docker-compose.yml`
- Reiniciar o container: `docker compose restart <service>`

---

## Documentação

| Arquivo                                                                     | Conteúdo                                  |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| [server/docs/general.md](server/docs/general.md)                               | Middlewares, configurações, entry points |
| [server/docs/routes.md](server/docs/routes.md)                                 | Endpoints da API com exemplos              |
| [server/docs/notes.md](server/docs/notes.md)                                   | Módulo de notas                           |
| [server/docs/authentication.md](server/docs/authentication.md)                 | Fluxo de autenticação                    |
| [server/docs/projects-api.md](server/docs/projects-api.md)                     | API de projetos                            |
| [server/docs/system-admin.md](server/docs/system-admin.md)                     | Sistema de administração                 |
| [server/docs/AI_CHAT_IMPLEMENTATION.md](server/docs/AI_CHAT_IMPLEMENTATION.md) | Integração Gemini                        |
| [server/db_docs/readme.md](server/db_docs/readme.md)                           | Schema completo do banco                   |
| [.github/copilot-instructions.md](.github/copilot-instructions.md)            | Instruções para AI agents                |

---

## Funcionalidades

### Aplicação Principal (`web/`)

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

### Console Administrativo (`admin-console/`)

- Dashboard com métricas e estatísticas
- Gestão de usuários do sistema
- Gestão de planos e assinaturas
- Painel de administração central
- Controle de permissões de super admins

### Blog (`blog/`)

- Página institucional e landing page
- Blog de atualizações e novidades
- SEO otimizado com sitemap e robots.txt
- Design responsivo

---

## Principais Dependências

### Backend (`server/`)

- `express` - Framework web
- `pg` - PostgreSQL client
- `jsonwebtoken` - Autenticação JWT
- `bcrypt` - Hash de senhas
- `passport` - Estratégias de autenticação OAuth
- `nodemailer` - Envio de emails
- `aws-sdk` - Storage S3/Spaces
- `@google/generative-ai` - Google Gemini AI
- `helmet` - Segurança HTTP headers
- `cors` - Cross-Origin Resource Sharing

### Frontend (`web/`, `blog/`, `admin-console/`)

- `next` - Framework React 16
- `react` / `react-dom` - UI library
- `@dnd-kit` - Drag and drop (apenas web)
- `tailwindcss` - Estilização
- `react-icons` - Ícones
- `@vercel/analytics` - Analytics (apenas web)

---

## Licença

MIT License - Ver [LICENSE](LICENSE)

---

## Autor

**Gael Renê Gomes**  
- Email: hello@gaelgomes.dev
- Website: [gaelgomes.dev](https://gaelgomes.dev)
- GitHub: [@eugaelgomes](https://github.com/eugaelgomes)
