# Why Weave?

**Weave** started as a collaborative project management (with an AI proactive engine) and note-taking platform. As the project evolved, so did its purpose — it has since grown into a **modular platform for building, orchestrating, and running custom AI Agents**.

Built around an extensible multi-module architecture, the system lets users and workspaces assemble AI capabilities tailored to their own needs — connecting tools, knowledge bases, LLMs, and autonomous workflows.

---

## Quick Start via `npx`

You can initialize a new Weave workspace directly using `npx` (no cloning required):

```bash
npx github:eugaelgomes/theweave
```

Or run non-interactively:

```bash
npx github:eugaelgomes/theweave --dir my-weave-app -y
```

---

## Repository structure

```
theweave/
├── server/          # weave-notes-api  — Express REST API (TypeScript)
├── web/             # weave-notes      — Next.js 16 frontend (TypeScript)
├── worker/          # weave-worker     — Background job processor (Node.js)
├── llm/             # weave-engine     — AI / LLM execution engine (TypeScript)
├── packages/
│   ├── shared/      # @theweave/database — Prisma client, logger, pg pool (shared)
│   └── eslint-rules/
├── scripts/         # deploy.sh and helpers
├── docker-compose.yml          # Development infrastructure (Postgres, Redis)
├── docker-compose.prod.yml     # Production stack
├── .env.example                # Unified env var reference
└── package.json                # npm workspaces root
```

### Workspaces

| Workspace           | Package name           | Description                                                                 |
| ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `server`          | `weave-notes-api`    | Core API — agent management, orchestration, auth, webhooks, and MCP         |
| `web`             | `weave-notes`        | Next.js frontend UI for the AI Agent platform                               |
| `worker`          | `weave-worker`       | Background processor — agent proactive tasks, embeddings, email, backups    |
| `llm`             | `weave-engine`       | LLM execution — tool calling, reasoning loops, MCP client, tracing          |
| `packages/shared` | `@theweave/database` | Shared Prisma client, pg pool, structured logger                            |

## Local development

### Prerequisites

- **Node.js 20+**
- **Docker + Docker Compose v2** (for Postgres and Redis)
- **[Doppler CLI](https://docs.doppler.com/docs/install-cli)** (secret manager — required for `npm run dev`)

### 1. Start infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL and Redis locally.

### 2. Configure secrets

Secrets are managed via [Doppler](https://doppler.com). The root dev command injects them automatically.

```bash
doppler login
doppler setup   # select project: weave-api, config: dev
```

Or, for plain `.env` usage, copy the example and fill in values:

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Database setup

```bash
# Run migrations
npm run db:migrate

# Generate Prisma client (already included in install, but run after schema changes)
npm run db:generate

# Optional: open Prisma Studio
npm run db:studio
```

### 5. Start all services

```bash
npm run dev
```

This runs all four services in parallel using `concurrently` with Doppler-injected secrets:

| Label      | Service              | URL                   |
| ---------- | -------------------- | --------------------- |
| `server` | Core API             | http://localhost:8080 |
| `web`    | Agent platform UI    | http://localhost:3000 |
| `worker` | Background processor | —                    |
| `llm`    | AI engine            | —                    |

---

## Useful commands

### Root workspace

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run dev`         | Start all services (requires Doppler)     |
| `npm run db:migrate`  | Run Prisma migrations                     |
| `npm run db:generate` | Regenerate Prisma client                  |
| `npm run db:push`     | Push schema without migration (prototype) |
| `npm run db:studio`   | Open Prisma Studio                        |
| `npm run db:triggers` | Apply SQL triggers                        |
| `npm run lint`        | Lint all workspaces                       |
| `npm run typecheck`   | TypeScript check all workspaces           |
| `npm run format`      | Format all workspaces                     |

### Per-workspace

```bash
npm run dev -w server       # API only
npm run dev -w web          # Frontend only
npm run dev -w worker       # Worker only
npm run dev -w llm          # LLM engine only
npm run build -w server     # Build API
npm run build -w web        # Build frontend
npm run typecheck -w llm    # Type-check engine
```

---

## Worker responsibilities

As an AI-first platform, the background worker handles asynchronous tasks to keep the engine and API responsive:

| Area                                     | Details                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| **Agent proactive tasks**          | Background execution for scheduled and triggered agent workflows             |
| **Knowledge embeddings**           | Vector embedding generation for user bases and context files                 |
| **AI report scheduler / delivery** | Scheduled generation and email delivery of autonomous AI reports             |
| **Tracing events**                 | Persist LLM traces, spans, and token usage from the execution engine         |
| **Platform maintenance**           | Expired tokens cleanup, backup exports, and domain verification              |
| **Billing & usage**                | Process plan usage increments and subscription rollovers                     |

---

## Environment variables

All services share a single unified `.env` at the monorepo root (see `.env.example` for the full reference). Key groups:

| Group                | Variables                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**       | `NODE_ENV`, `APP_DOMAIN`, `FRONTEND_URL`, `ALLOWED_ORIGINS`                                                                                      |
| **Database**   | `DATABASE_HOST_URL`, `DATABASE_SERVICE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`                                        |
| **Redis**      | `REDIS_URL`, and various queue keys (e.g., `REDIS_DOMAIN_VERIFY_DELAYED_QUEUE_KEY`, `REDIS_PLAN_USAGE_DELAYED_QUEUE_KEY`)                              |
| **Auth**       | `SESSION_SECRET`, `SECRET_KEY`, `BCRYPT_SALT_ROUNDS`                                                                                               |
| **Storage**    | `STORAGE_ENABLED`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET_NAME`, `STORAGE_REGION` *(optional — storage gracefully disables itself when unset)* |
| **Email**      | `EMAIL_TRANSPORT`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, `EMAIL_SMTP_PASSWORD`, `EMAIL_FROM`, `CONTACT_EMAIL`                |
| **LLM**        | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `WEAVE_API_URL`                                                                         |
| **OAuth**      | `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`                                                                 |
| **Monitoring** | `SENTRY_DSN` *(optional)*                                                                                                                            |
| **Frontend**   | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`                                                                                                         |

### Doppler

Each service ships with a `doppler.yaml` pointing to the `weave-api` project and `dev`/`prd` configs. The root `npm run dev` injects secrets automatically via `doppler run`.

For production service tokens, set `DOPPLER_TOKEN` in the environment before starting containers.

---

## Deploy

GitHub Actions deploy on push to `main`:

- `.github/workflows/deploy.yml` — validates workspaces, SSH deploy, `docker compose -f docker-compose.prod.yml up -d --build`

### Production stack (`docker-compose.prod.yml`)

| Service | Notes                |
| ------- | -------------------- |
| Caddy   | TLS termination      |
| server  | weave-api            |
| worker  | Background processor |
| llm     | AI engine            |

Manual deploy:

```bash
npm run deploy              # all services
npm run deploy:server       # server only
npm run deploy:worker       # worker only
npm run deploy:engine       # llm only
```

---

## Troubleshooting

**Port in use**

```bash
docker compose down
```

Check host processes on ports **80**, **443**, **8080**, **3000**, **5432**, **6379**.

**Schema out of sync after a pull**

```bash
npm run db:generate
npm run db:migrate
```

**Worker not starting — missing env vars**

The worker strictly requires `DATABASE_*`, `NODE_ENV`, `CONTACT_EMAIL`, `FRONTEND_URL`, and all **`REDIS_*_QUEUE_KEY`** variables defined in `queue-queue-keys.js`. When `EMAIL_TRANSPORT=smtp` (the default), it also requires `EMAIL_FROM`, `EMAIL_SMTP_HOST`, `EMAIL_SMTP_USER`, and `EMAIL_SMTP_PASSWORD`. Set `EMAIL_TRANSPORT=noop` only to explicitly disable delivery. Storage (`STORAGE_*`) and `API_URL` are optional and will gracefully fallback if unset.

**Changes not reflected after Docker rebuild**

```bash
docker compose down -v
docker compose up --build
```

**Service logs**

```bash
docker compose logs -f server
docker compose logs -f worker
docker compose logs -f llm
docker compose logs -f caddy
```

---

## Author

Created and maintained by **Gael R. Gomes** ([gael.rens@gmail.com](mailto:gael.rens@gmail.com)).
Website: [https://gaelgomes.dev](https://gaelgomes.dev)

---

## License

MIT. See [LICENSE](LICENSE).
