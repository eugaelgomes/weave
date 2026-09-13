# Weave — Backend (`weave-api`)

REST API for Weave. **Node.js 20+** (see CI) / **Express 4**. Default port: **8080**.

---

## Layout

```text
src/
├── app.js                 # Express app: middlewares, route registration
├── index.js               # HTTP server entry, graceful shutdown, queue consumers
├── routes/
│   ├── index.js           # Registers internal + public API bases
│   ├── internal.routes.js # /api/v1/* (browser app + cookies / challenge)
│   └── public.routes.js   # /api/public/v1/* (public endpoints)
├── config/
│   ├── allowed-origins.js # CORS helpers + cookie domain
│   └── module-alias.ts    # `@/` → `src/`
├── middlewares/
│   ├── http/              # Base stack, CORS, session, IP
│   ├── auth/              # verify-token, require-org-permission, project guards
│   ├── security/          # Rate limits, internal web challenge
│   └── errors/            # Global error handler
├── modules/               # Features — routes / controllers / repositories per domain
├── database/
│   └── connection.js      # PostgreSQL pool (`executeQuery`, …)
├── services/
│   ├── queue/             # Redis producers and keys
│   ├── email/             # SMTP queue + templates
│   ├── reasoning/         # Engine trigger/response consumers (in API process)
│   ├── plans/             # Plan paths and helpers
│   ├── storage/           # S3-compatible object storage
│   └── …                  # Other integrations
└── utils/
```

---

## Scripts

```bash
npm run dev      # nodemon + ts-node (hot reload)
npm run build    # Babel: src/ → dist/
npm start        # node dist/index.js (production)
npm run check    # lint + TypeScript noEmit
npm test         # Jest
npm run format   # Prettier
```

---

## Local setup (without Docker)

```bash
cd weave-api
npm install
cp .env.example .env   # fill required variables
npm run dev
```

From the monorepo root (API container only):

```bash
docker compose up server --build
```

---

## Environment variables

| Variable                                         | Description                                           |
| ------------------------------------------------ | ----------------------------------------------------- |
| `APP_PORT`                                       | Listen port (default **8080**)                        |
| `NODE_ENV`                                       | `development` or `production`                         |
| `DATABASE_NAME`                                  | PostgreSQL database name                              |
| `DATABASE_HOST_URL`                              | Database host                                         |
| `DATABASE_SERVICE_PORT`                          | Database port (default **5432**)                      |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD`        | Database credentials                                  |
| `SSL_CERTIFICATE`                                | Optional client SSL for DB                            |
| `SESSION_SECRET`                                 | Express session secret                                |
| `SECRET_KEY`                                     | JWT signing secret                                    |
| `ALLOWED_ORIGINS` / `PRODUCTION_ALLOWED_ORIGINS` | Allowed browser `Origin` values (comma-separated)     |
| `COOKIE_DOMAIN`                                  | Cookie domain (`localhost` in dev)                    |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`      | Google OAuth                                          |
| `GOOGLE_REDIRECT_URI`                            | Google OAuth callback                                 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`      | GitHub OAuth                                          |
| `EMAIL_TRANSPORT`                                | Email transport (`smtp` or `noop`)                    |
| `EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT`            | SMTP server host and port                             |
| `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASSWORD`        | SMTP credentials                                      |
| `EMAIL_SMTP_SECURE` / `EMAIL_SMTP_REQUIRE_TLS`   | SMTP TLS settings                                     |
| `EMAIL_FROM`                                     | Default transactional sender                           |
| `STORAGE_ENABLED`                                | Enable/disable object storage (`true` / `false`)      |
| `STORAGE_ENDPOINT`                               | S3 endpoint (e.g. AWS S3, MinIO, DO Spaces)           |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`       | Object storage keys                                   |
| `STORAGE_BUCKET_NAME` / `STORAGE_REGION`          | Bucket and region                                     |
| `GEMINI_API_KEY`                                 | Google Generative AI (where used from API)            |
| `FRONTEND_URL`                                   | Front-end URL (OAuth redirects, emails)               |
| `TOKEN_IP`                                       | Optional ipinfo.io token                              |
| `INTERNAL_WEB_CHALLENGE_SECRET`                  | Required in production for internal browser API guard |

Add Redis, worker, and engine URLs as required by your deployment (`weave-api` enqueue and consumer code under `services/queue` and `services/reasoning`).

---

## Routes

- **Internal browser API:** `/api/v1` — mounted from [`src/routes/internal.routes.js`](src/routes/internal.routes.js). After `Origin` checks (where applicable), requests must pass the **internal web challenge** middleware except for documented bypass paths (for example webhooks and specific SSO routes). Challenge token: `GET /api/v1/_internal/challenge`, header `X-Weave-Internal-Challenge` on subsequent calls, signed with `INTERNAL_WEB_CHALLENGE_SECRET` (verification skipped in dev if the secret is unset).
- **Public API:** `/api/public/v1` — public router from [`src/routes/public.routes.js`](src/routes/public.routes.js).

| Prefix             | Module                                    | Auth / notes                      |
| ------------------ | ----------------------------------------- | --------------------------------- |
| `/auth`            | Authentication                            | Mixed (endpoints vary)            |
| `/users`           | Users                                     | Mixed                             |
| `/password`        | Password reset                            | Public flows + tokens             |
| `/notes`           | Notes and blocks                          | Yes                               |
| `/backup`          | Backup / export                           | Yes                               |
| `/projects`        | Projects, collaborators, tags, priorities | Yes                               |
| `/organizations`   | Organizations, members, areas             | Yes                               |
| `/weave-ai`        | AI chat, agents, models                   | Yes                               |
| `/plans`           | Plans and usage                           | Yes                               |
| `/notifications`   | Notifications                             | Yes                               |
| `/calendar-events` | Calendar                                  | Yes                               |
| `/api-tokens`      | API tokens                                | Yes                               |
| `/webhooks`        | Inbound webhooks                          | Often unauthenticated; see routes |
| `GET /health`      | Liveness                                  | No (not under `/api/v1`)          |

Indexes for maintainers: [documents/routes/README.md](documents/routes/README.md), [documents/middlewares/README.md](documents/middlewares/README.md), [documents/services/README.md](documents/services/README.md).

---

## Code conventions

### Modules

Each feature lives under `src/modules/<feature>/` with **routes**, **controllers** (HTTP orchestration only — delegate to repositories/services), and **repositories** (SQL and persistence).

```text
modules/notes/
├── notes.routes.js
├── notes.controller.js
└── notes.repository.js   # or repositories/ folder, depending on module
```

### Database access

Use parameterized queries via the shared pool (see [`src/database/connection.js`](src/database/connection.js)):

```javascript
const { executeQuery } = require("@/database/connection");

const results = await executeQuery(
  "SELECT id::text, title FROM notes WHERE user_id = $1",
  [userId]
);
```

### Path aliases

`@/` maps to `src/` (via `module-alias` and Babel):

```javascript
const { pool } = require("@/database/connection");
const authRoutes = require("@/modules/authentication/auth.routes");
```

### Authentication

- JWT may be delivered in `HttpOnly` cookies depending on flow; after auth middleware, `req.user.userId` is available.
- Middleware: [`src/middlewares/auth/verify-token.js`](src/middlewares/auth/verify-token.js).

### Internal browser API

Besides `Origin` checks, internal routes use [`src/middlewares/security/internal-web-challenge.js`](src/middlewares/security/internal-web-challenge.js): short-lived JWT tied to the issuing `Origin`. The front end refreshes it from [`weave-app/app/_services/internal-challenge.ts`](../weave-app/app/_services/internal-challenge.ts).

### Errors

- Global handler: [`src/middlewares/errors/error-handler.js`](src/middlewares/errors/error-handler.js)
- Taxonomy and helpers: [`src/errors/`](src/errors/) (`AppError`, `fromUnknown`, Postgres mapper)
- Contract and PR checklist: [`documents/middlewares/error-handler.md`](documents/middlewares/error-handler.md)

Use `next(fromUnknown(err))` or `throw AppError.*` for operational failures. Public API error messages are **English only**. Never return raw Postgres messages, stack traces, or internal exception text to clients in production. Run `npm run audit:errors` before opening a PR.

### SQL conventions

- Cast bigint IDs to text in JSON-friendly queries (`id::text`) where the codebase does so.
- Prefer parameterized queries (`$1`, `$2`, …) everywhere.

---

## Main dependencies

| Package                                  | Role                            |
| ---------------------------------------- | ------------------------------- |
| `express`                                | HTTP framework                  |
| `jsonwebtoken` / `express-jwt`           | JWT                             |
| `bcrypt`                                 | Password hashing                |
| `passport` + Google / GitHub strategies  | OAuth                           |
| `pg`                                     | PostgreSQL client               |
| `connect-pg-simple`                      | Session store in PostgreSQL     |
| `ioredis`                                | Redis queues                    |
| `nodemailer`                             | SMTP email delivery (worker)    |
| `@aws-sdk/client-s3`                     | Object storage                  |
| `@google/generative-ai`                  | Gemini (where invoked from API) |
| `multer` / `sharp`                       | Uploads and images              |
| `helmet` / `cors` / `express-rate-limit` | HTTP hardening and limits       |
| `module-alias` / Babel                   | Aliases and production build    |

---

## Documentation

Long-form Markdown under a top-level `docs/` folder is **not** maintained in this tree. Use the **documents** indexes above and the source modules as the source of truth.

---

## Projects — GET list filters (internal API)

Base path: `/api/v1/projects` (requires auth via `verifyToken`). Invalid UUID path parameters return **400**; invalid query shapes return **422**.

### List envelope (when filters or pagination are used)

Responses include `data`, the legacy key (`projects`, `notes`, `stages`, …), `pagination` (`page`, `limit`, `total`, `total_pages`, `has_next`, `next_cursor` reserved as `null`), `sort`, and `filters_applied`.

### Endpoints (query highlights)

| Method | Path                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/projects`                          | Filters: `search`, `status`, `methodology` (CSV: `KANBAN`, `SCRUM` only), `visibility`, `ownership`, `owner_user_id`, `collaborator_user_id`, `organization_id` (org-wide roles only), `parent_only`, `has_parent`, date ranges (`created_*`, `updated_*`, `start_*`, `target_end_*`), `progress_min`/`max`, `priority`, `tags`, `active`. `include=collaborators,notes,subprojects`. `sort=field:asc\|desc`. |
| GET    | `/projects/:id`                      | `include=collaborators,notes,subprojects,stages` (default: collaborators + notes).                                                                                                                                                                                                                                                                                                                            |
| GET    | `/projects/:id/my-view-preference`   | `{ view: "board" \| "list" }` for the authenticated user (`READ_PROJECT_CONTENT`).                                                                                                                                                                                                                                                                                                                            |
| PUT    | `/projects/:id/my-view-preference`   | Body `{ view: "board" \| "list" }`. Persists UI layout preference per user per project.                                                                                                                                                                                                                                                                                                                       |
| GET    | `/projects/:id/stages`               | `include_done`, `search`, pagination, `sort`.                                                                                                                                                                                                                                                                                                                                                                 |
| GET    | `/projects/:projectId/notes`         | `status`, `priority_id`, `tags` (note tag UUIDs), `stage_id`, `created_by`, `due_from`/`to`, timestamps, `search`.                                                                                                                                                                                                                                                                                            |
| GET    | `/projects/:projectId/collaborators` | `role`, `suspended`, `search`, `added_from`/`to`. Requires `READ_PROJECT_CONTENT`.                                                                                                                                                                                                                                                                                                                            |
| GET    | `/projects/:id/sprints`              | `status`, date ranges on `start_*` / `end_*`, pagination; legacy `limit` without `page` still supported.                                                                                                                                                                                                                                                                                                      |
| GET    | `/projects/:id/reasonings`           | Extends `sprintId`, `reasoningType`, `from`/`to`, `is_read`, `is_pinned`, `is_dismissed`, `created_by`, pagination.                                                                                                                                                                                                                                                                                           |

### Indexes (optional)

See [db_structure_docs/migrations/2026-05-07_projects_filters_indexes.sql](db_structure_docs/migrations/2026-05-07_projects_filters_indexes.sql).

### View preference vs methodology

- **Methodology** (`projects.methodology`): process template (`KANBAN` \| `SCRUM`); drives default stages and related behavior.
- **View preference**: stored in `user_project_prefs.prefs` (not on `projects`); supports `prefs.view` with `board` \| `list`. Migration: [db_structure_docs/migrations/2026-05-08_split_view_pref_and_shrink_methodology.sql](db_structure_docs/migrations/2026-05-08_split_view_pref_and_shrink_methodology.sql).
