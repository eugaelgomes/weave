# Documentação Técnica - Server

Estrutura e funcionamento dos pontos de entrada, configurações, middlewares e serviços do servidor.

---

## 1. Pontos de Entrada

### 1.1 index.js (`src/index.js`)

Inicializa o servidor HTTP. Responsabilidades:

- Registra aliases de módulos via `module-alias/register`
- Normaliza e valida a porta (`APP_PORT`, padrão 8080)
- Cria servidor HTTP com `http.createServer(app)` na interface `0.0.0.0`
- Implementa graceful shutdown (SIGTERM/SIGINT) com timeout de 30s — fecha conexões HTTP, encerra pool do banco e sai
- Captura `uncaughtException` e `unhandledRejection` com `process.exit(1)`

### 1.2 app.js (`src/app.js`)

Configura e exporta a instância Express.

```javascript
const app = express();
configureGlobalMiddlewares(app);
app.use("/api/v1", routes); // Prefixo de todas as rotas
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.globalErrorHandler);
module.exports = { app };
```

Também importa `@/services/jobs/index` para iniciar o cleanup automático de jobs no boot.

### 1.3 routes.js (`src/routes.js`)

Router central que mapeia os módulos da API:

| Prefixo                 | Módulo                |
| ----------------------- | --------------------- |
| `/api/v1/auth`          | Auth                  |
| `/api/v1/users`         | Users                 |
| `/api/v1/password`      | Password              |
| `/api/v1/notes`         | Notes                 |
| `/api/v1/backup`        | Backup                |
| `/api/v1/projects`      | Projects              |
| `/api/v1/weave-ai`      | Weave AI              |
| `/api/v1/organizations` | Organizations         |
| `/api/v1/plans`         | Plans                 |
| `/api/v1/health`        | Health check (inline) |

O health check retorna status, uptime e timestamp. Headers `Cache-Control: no-cache, no-store, must-revalidate`.

---

## 2. Configurações

### 2.1 module-alias.ts (`src/config/module-alias.ts`)

Registra `@` como alias para `src/`, usando `module-alias`. Carregado automaticamente no `index.js`.

```javascript
// Uso
const { pool } = require("@/services/db/index");
```

### 2.2 allowed-origins.js (`src/config/allowed-origins.js`)

Exporta `allowedOrigins` (lista de origens CORS) e `getCookieDomain(hostname)` para determinar o domínio dos cookies de autenticação.

---

## 3. Middlewares

### 3.1 Global Middleware (`src/middlewares/global-middleware.js`)

Função `configureGlobalMiddlewares(app)` aplica, nesta ordem:

1. `cookieParser()` — parse de cookies
2. `sessionMiddleware` — sessão Express
3. `express.urlencoded({ extended: true })` e `express.json()` — body parsers
4. `trust proxy` = 1
5. `getClientIp` — extrai IP real do request
6. `cors(...)` — CORS dinâmico com whitelist + suporte a wildcard; em dev aceita localhost/127.0.0.1 em qualquer porta
7. `helmet(...)` — HSTS (1 ano, preload), CSP, frameguard deny, noSniff, referrerPolicy strict-origin-when-cross-origin

**CORS:**

- `credentials: true`
- Métodos: GET, POST, PUT, DELETE, PATCH, OPTIONS
- `maxAge: 600` (10 min de preflight cache)
- Em produção, requer header `Origin`

### 3.2 Error Handler (`src/middlewares/error-handler.js`)

Dois handlers encadeados:

- **notFoundHandler**: cria erro 404 com a URL tentada e repassa via `next(err)`
- **globalErrorHandler**: responde JSON com `{ error: { message, status, timestamp, path, method } }`. Loga stack apenas em dev ou para erros 5xx.

### 3.3 Outros Middlewares

| Arquivo                                  | Função                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| `authentication/index.js`                | `verifyToken` — valida JWT do cookie em rotas protegidas     |
| `data/input-validation.js`               | Validações com `express-validator` (ex: `loginValidation()`) |
| `data/stringfy.js`                       | Converte campos do body para string                          |
| `data/image-utils.js` / `profile-img.js` | Processamento e validação de imagens                         |
| `security/limiters.js`                   | `requestLimiter` — rate limiting por IP                      |
| `security/ip-address.js`                 | `getClientIp` — extração de IP real                          |
| `security/session.js`                    | Configuração de sessão Express                               |

---

## 4. Serviços

### 4.1 Database (`src/services/db/index.js`)

Pool de conexões PostgreSQL via `pg`.

**Variáveis de Ambiente:**

| Variável                | Descrição     |
| ----------------------- | ------------- |
| `DATABASE_HOST_URL`     | Host do banco |
| `DATABASE_SERVICE_PORT` | Porta         |
| `DATABASE_USERNAME`     | Usuário       |
| `DATABASE_PASSWORD`     | Senha         |
| `DATABASE_NAME`         | Nome do banco |

SSL habilitado por padrão com `rejectUnauthorized: false`.

**Exports:**

| Método                       | Retorno           | Descrição                          |
| ---------------------------- | ----------------- | ---------------------------------- |
| `pool`                       | `Pool`            | Instância do pool                  |
| `getConnection()`            | `Promise<Client>` | Obtém client do pool               |
| `executeQuery(sql, params?)` | `Promise<Array>`  | Executa query e retorna `rows`     |
| `rowCount(sql, params?)`     | `Promise<number>` | Executa query e retorna `rowCount` |

Conexões são liberadas automaticamente no `finally` de `executeQuery` e `rowCount`.

### 4.2 Email (`src/services/email/config/index.js`)

Cliente Resend com singleton pattern.

**Variáveis de Ambiente:** `RESEND_API_KEY`, `EMAIL_FROM`

**Configuração do serviço:**

- Mantém interface `sendMail` compatível para os templates existentes
- Normaliza destinatários (`to`, `cc`, `bcc`, `replyTo`) para o formato esperado pelo Resend
- Falha cedo quando faltam variáveis obrigatórias

**Templates disponíveis** (`src/services/email/templates/`):

| Template                      | Path                                        |
| ----------------------------- | ------------------------------------------- |
| Recuperação de senha          | `users-access/rescue-password/`             |
| Reset de senha                | `users-access/reset-password/`              |
| Boas-vindas                   | `welcome-mail/`                             |
| Notificação de backup         | `backup/backup-notification.js`             |
| Backup concluído              | `backup/index.js`                           |
| Exclusão de conta (request)   | `delete-account/delete-account-request.js`  |
| Conta excluída                | `delete-account/deleted-account-message.js` |
| Convite de colaboração (nota) | `notes/invite/`                             |
| Convite de membro (org)       | `organizations/invite/`                     |
| Adição a projeto              | `projects/add-person.js`                    |
| Convite de membro (geral)     | `invite-member/mail.js`                     |

### 4.3 Job Manager (`src/services/jobs/index.js`)

Gerenciador de jobs assíncronos com persistência em banco (tabela `jobs`) e cache em memória (`Map`). Exportado como singleton.

**Estados:** `pending` → `processing` → `completed` | `failed`

Timestamps `started_at` e `completed_at` são setados automaticamente nas transições.

**Métodos:**

| Método                               | Parâmetros                                | Retorno                                                         |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------- |
| `createJob(type, userId, metadata?)` | tipo, userId, metadados                   | `Promise<Object>` — job criado                                  |
| `updateJob(jobId, updates)`          | id, `{ status, progress, error, result }` | `Promise<Object>` — job atualizado                              |
| `getJob(jobId)`                      | id                                        | `Promise<Object\|null>` — consulta cache primeiro, depois banco |
| `getUserJobs(userId)`                | userId                                    | `Promise<Array>` — lista ordenada por `created_at DESC`         |
| `clearJobFromCache(jobId)`           | id                                        | `void` — remove apenas do cache                                 |
| `clearCache()`                       | —                                         | `void` — limpa todo o cache em memória                          |

**Cleanup automático de backups:**

- Executado a cada 6 horas (e 5s após boot)
- Busca tokens de download expirados na tabela `tokens`
- Deleta arquivos do Storage (S3) e remove tokens do banco
- Proteção contra execuções concorrentes via flag `cleanupIsRunning`

### 4.4 Storage / Spaces (`src/services/storage/index.js`)

Classe `SpacesService` para Digital Ocean Spaces (S3-compatible). Exportada como singleton.

**Variáveis de Ambiente:**

| Variável                | Descrição               |
| ----------------------- | ----------------------- |
| `DO_SPACES_ENDPOINT`    | Endpoint S3             |
| `DO_SPACES_ACCESS_KEY`  | Access key              |
| `DO_SPACES_SECRET_KEY`  | Secret key              |
| `DO_SPACES_BUCKET_NAME` | Nome do bucket          |
| `DO_SPACES_REGION`      | Região (padrão: `nyc3`) |

Valida credenciais no construtor — lança erro se incompletas.

**Métodos:**

| Método                                              | Descrição                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `uploadImage(buffer, mimeType, folder?, fileName?)` | Upload público (ACL public-read, cache 1 ano). Retorna `{ success, url, key, fileName, size }`                    |
| `uploadBackup(content, userId, fileName?)`          | Upload privado de CSV (ACL private, sem cache, expira 48h). Retorna `{ success, key, fileName, size, expiresAt }` |
| `deleteImage(key)`                                  | Deleta arquivo. Retorna `boolean`                                                                                 |
| `downloadFile(key)`                                 | Download de arquivo. Retorna `Buffer`                                                                             |
| `extractKeyFromUrl(url)`                            | Extrai key S3 de uma URL completa                                                                                 |
| `validateConfiguration()`                           | Retorna `{ isValid, config, missing }`                                                                            |
| `getFileExtensionFromMimeType(mimeType)`            | Mapeia MIME para extensão                                                                                         |

**Formatos de imagem suportados:** JPEG, PNG, WebP, GIF

---

## 5. Boas Práticas

- Usar alias `@/` para todas as importações internas
- Queries parametrizadas (`$1`, `$2`, ...) — nunca interpolar valores
- `executeQuery`/`rowCount` já liberam conexões; não usar `getConnection` diretamente a menos que precise de transações
- Todas as credenciais em variáveis de ambiente (`.env`)
- Controllers devem delegar queries ao Repository e lançar erros descritivos

---

## 6. Dependências Principais

| Pacote               | Uso                     |
| -------------------- | ----------------------- |
| `express`            | Framework HTTP          |
| `pg`                 | Cliente PostgreSQL      |
| `resend`             | Envio de emails transacional |
| `@aws-sdk/client-s3` | Storage S3-compatible   |
| `module-alias`       | Path aliases            |
| `helmet`             | Headers de segurança    |
| `cors`               | Política CORS           |
| `cookie-parser`      | Parse de cookies        |
| `bcrypt`             | Hash de senhas          |
| `jsonwebtoken`       | Geração/verificação JWT |
| `express-validator`  | Validação de input      |
| `dotenv`             | Variáveis de ambiente   |

---

## 7. Estrutura de Diretórios

```
src/
├── index.js                    # Boot do servidor + graceful shutdown
├── app.js                      # Instância Express + pipeline de middlewares
├── routes.js                   # Router central (/api/v1)
├── config/
│   ├── module-alias.ts         # Alias @ → src/
│   └── allowed-origins.js      # CORS whitelist + cookie domain
├── middlewares/
│   ├── error-handler.js        # 404 + global error handler
│   ├── global-middleware.js     # CORS, helmet, parsers, session
│   ├── authentication/         # JWT verification
│   ├── data/                   # Validação, sanitização, imagens
│   └── security/               # Rate limiting, IP, sessão
├── modules/                    # Módulos de domínio (controller/repository/routes)
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
│   ├── db/                     # Pool PostgreSQL
│   ├── email/                  # Resend + templates
│   ├── jobs/                   # Job manager com persistência
│   ├── storage/                # Digital Ocean Spaces (S3)
│   ├── secrets/                # Gerenciamento de chaves
│   ├── weave-ai/               # Integração Gemini AI
│   ├── note_export/            # Export PDF
│   ├── patterns/               # Padrões de produto
│   └── plans/                  # Gerenciamento de planos
└── utils/
    ├── detect-region.js
    ├── image-validator.js
    └── system_logs/            # Logs de auth e perfil
```

---

_Atualizado em: Fevereiro de 2026_
