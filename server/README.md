# Weave Notes — Backend (server/)

API REST do Weave Notes. Node.js 22+ / Express.js 4. Porta padrão: `8080`.

---

## Estrutura

```
src/
├── app.js              # Configuração Express, middlewares, rotas
├── index.js            # Entry point — HTTP server, graceful shutdown
├── routes.js           # Router central (mapeia todos os módulos)
├── config/
│   ├── allowed-origins.js   # Lista CORS + getCookieDomain()
│   └── module-alias.ts      # Alias @/ → src/
├── middlewares/
│   ├── global-middleware.js # configureGlobalMiddlewares()
│   ├── error-handler.js     # notFoundHandler + globalErrorHandler
│   ├── authentication/      # Validação JWT
│   ├── data/                # Validação de entrada + upload (multer)
│   └── security/            # Rate limiters, sessão, IP
├── modules/                 # Features — cada uma com routes/controller/repository
│   ├── auth/
│   ├── backup/
│   ├── notes/
│   ├── organizations/
│   ├── password/
│   ├── plans/
│   ├── projects/
│   ├── users/
│   └── weave-ai/
├── services/
│   ├── db/             # Pool PostgreSQL (executeQuery, rowCount)
│   ├── email/          # Nodemailer + templates
│   ├── jobs/           # Tarefas agendadas (iniciam no boot)
│   ├── note_export/    # Exportação de notas (PDF)
│   ├── patterns/       # Padrões de produto
│   ├── plans/          # Gerenciamento de planos
│   ├── secrets/        # Gerenciamento de segredos
│   ├── storage/        # AWS S3 / DigitalOcean Spaces
│   └── weave-ai/       # Google Gemini AI
└── utils/              # Helpers e logs
```

---

## Scripts

```bash
npm run dev      # nodemon + ts-node (hot reload)
npm run build    # Babel transpila src/ → dist/
npm start        # Executa dist/index.js (produção)
npm run format   # Prettier
```

---

## Setup local (sem Docker)

```bash
cd server
npm install
cp .env.example .env   # preencher variáveis
npm run dev
```

Com Docker (recomendado, a partir da raiz do monorepo):

```bash
docker compose up server --build
```

---

## Variáveis de Ambiente

| Variável                                           | Descrição                                                     |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `APP_PORT`                                        | Porta do servidor (padrão:`8080`)                            |
| `NODE_ENV`                                        | `development` \| `production`                               |
| `DATABASE_NAME`                                   | Nome do banco PostgreSQL                                        |
| `DATABASE_HOST_URL`                               | Host do banco                                                   |
| `DATABASE_SERVICE_PORT`                           | Porta do banco (padrão:`5432`)                               |
| `DATABASE_USERNAME`                               | Usuário do banco                                               |
| `DATABASE_PASSWORD`                               | Senha do banco                                                  |
| `SSL_CERTIFICATE`                                 | Certificado SSL para conexão com o banco (opcional)            |
| `SESSION_SECRET`                                  | Chave da sessão Express                                        |
| `SECRET_KEY`                                      | Chave para geração de JWT                                     |
| `ALLOWED_ORIGINS`                                 | Origens CORS (separadas por vírgula)                           |
| `COOKIE_DOMAIN`                                   | Domínio dos cookies (`localhost` em dev)                     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`     | OAuth Google                                                    |
| `GOOGLE_REDIRECT_URI`                             | URI de callback OAuth Google                                    |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`     | OAuth GitHub (em dev)                                           |
| `EMAIL_HOSTNAME` / `EMAIL_PORT`                 | SMTP host e porta                                               |
| `EMAIL_USERNAME` / `EMAIL_PASSWORD`             | Credenciais SMTP                                                |
| `DO_SPACES_ENDPOINT`                              | Endpoint DO Spaces (ex:`https://nyc3.digitaloceanspaces.com`) |
| `DO_SPACES_ACCESS_KEY` / `DO_SPACES_SECRET_KEY` | Credenciais S3/DO                                               |
| `DO_SPACES_BUCKET_NAME` / `DO_SPACES_REGION`    | Bucket e região                                                |
| `GEMINI_API_KEY`                                  | Chave Google Gemini AI                                          |
| `FRONTEND_URL`                                    | URL do frontend (usada em redirect OAuth e emails)              |
| `TOKEN_IP`                                        | Token ipinfo.io para geolocalização (opcional)                |

---

## Rotas

Base URL: `/api/v1`

| Prefixo            | Módulo                               | Auth  |
| ------------------ | ------------------------------------- | ----- |
| `/auth`          | Autenticação (login, OAuth, perfil) | Misto |
| `/users`         | Cadastro e gerenciamento de usuários | Misto |
| `/password`      | Recuperação e reset de senha        | Não  |
| `/notes`         | CRUD de notas e blocos                | Sim   |
| `/backup`        | Exportação e backup de dados        | Sim   |
| `/projects`      | Projetos e membros                    | Sim   |
| `/organizations` | Organizações e membros              | Sim   |
| `/weave-ai`      | Chat com IA (Gemini)                  | Sim   |
| `/plans`         | Planos de assinatura                  | Sim   |
| `GET /health`    | Health check (sem auth, sem CORS)     | Não  |

Documentação completa de endpoints: [docs/routes.md](docs/routes.md)

---

## Padrões de Código

### Módulos

Cada feature em `src/modules/<feature>/` com três arquivos:

```
modules/notes/
├── notes.routes.js       # Express Router
├── notes.controller.js   # Lógica de negócio + respostas HTTP
└── notes.repository.js   # Queries SQL
```

### Acesso ao banco

Sempre usar `executeQuery` / `rowCount` com queries parametrizadas:

```javascript
const { executeQuery, rowCount } = require('@/services/db/index');

const results = await executeQuery(
  'SELECT id::text, title FROM notes WHERE user_id = $1',
  [userId]
);
```

### Path aliases

`@/` aponta para `src/` (via `module-alias`):

```javascript
const { pool } = require('@/services/db/index');
const AuthController = require('@/modules/auth/auth.controller');
```

### Autenticação

- JWT em cookie `HttpOnly`
- `req.user.userId` disponível após middleware de auth
- Middleware: `src/middlewares/authentication/`

### Tratamento de erros

Handler global em `src/middlewares/error-handler.js`. Controllers lançam erros descritivos; o handler formata a resposta:

```javascript
// Controller
if (!note) throw new Error('Nota não encontrada');

// Resposta gerada pelo handler
{ "error": "Nota não encontrada" }
```

### Convenções SQL

- IDs `bigint` → `id::text` nas queries
- Tags como array PostgreSQL: `text[]`
- Queries parametrizadas obrigatórias (`$1`, `$2`, ...)

---

## Dependências principais

| Pacote                                     | Uso                            |
| ------------------------------------------ | ------------------------------ |
| `express`                                | Framework HTTP                 |
| `jsonwebtoken` / `express-jwt`         | Geração e validação de JWT |
| `bcrypt`                                 | Hash de senhas                 |
| `passport` / `passport-google-oauth20` | OAuth Google                   |
| `pg`                                     | Cliente PostgreSQL             |
| `connect-pg-simple`                      | Sessões no PostgreSQL         |
| `nodemailer`                             | Envio de emails via SMTP       |
| `@aws-sdk/client-s3`                     | Upload para S3/DO Spaces       |
| `@google/generative-ai`                  | Google Gemini AI               |
| `multer`                                 | Upload de arquivos             |
| `sharp`                                  | Processamento de imagens       |
| `helmet`                                 | Headers de segurança HTTP     |
| `express-rate-limit`                     | Rate limiting                  |
| `module-alias`                           | Alias `@/` para imports      |
| `nodemon` + `ts-node`                  | Hot reload em dev              |
| `@babel/core` + presets                  | Build para produção          |

---

## Documentação

DESATUALIZADO

| Arquivo                                                       | Conteúdo                                  |
| ------------------------------------------------------------- | ------------------------------------------ |
| [docs/general.md](docs/general.md)                               | Entry points, middlewares, configurações |
| [docs/routes.md](docs/routes.md)                                 | Todos os endpoints com exemplos            |
| [docs/notes.md](docs/notes.md)                                   | Módulo de notas e blocos                  |
| [docs/authentication.md](docs/authentication.md)                 | Fluxo de autenticação JWT e OAuth        |
| [docs/projects-api.md](docs/projects-api.md)                     | API de projetos                            |
| [docs/AI_CHAT_IMPLEMENTATION.md](docs/AI_CHAT_IMPLEMENTATION.md) | Integração Gemini                        |
| [docs/user_and_password.md](docs/user_and_password.md)           | Usuários e recuperação de senha         |
| [db_docs/readme.md](db_docs/readme.md)                           | Schema completo do banco de dados          |
| [db_docs/structure.sql](db_docs/structure.sql)                   | DDL do banco                               |
