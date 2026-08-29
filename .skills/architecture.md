# Weave System Architecture Skill

Use this skill when designing features or executing changes that span multiple workspaces, API contracts, shared databases, Redis queues, or authentication boundaries.

The Weave platform is a distributed, event-driven monorepo containing five primary components:

---

## Workspace Topography & System Boundaries

1. **`server/` (REST API & MCP Host):** Express.js API gateway, authentication manager (JWT & Refresh Token), Zod validation layer, and Model Context Protocol (MCP) server for local/remote agent tools.
2. **`web/` (Next.js App Router Frontend):** React & Tailwind CSS web application providing user interface, workspace management, dashboards, and real-time streaming connections.
3. **`llm/` (AI Execution Engine):** Isolated TypeScript runtime executing multi-provider LLM calls (OpenAI, Anthropic, DeepSeek, Kimi, xAI), ReAct agentic reasoning loops, and publishing stream events via Redis.
4. **`worker/` (Background Job Worker):** Event-driven consumer executing long-running background tasks, scheduled cron jobs, domain verifications, backups, and email dispatches.
5. **`packages/shared/` (`@theweave/database`):** Central shared infrastructure library housing the Prisma ORM client, PostgreSQL connection pool, Redis client wrappers, global logger, `requestContext` (`AsyncLocalStorage`), and S3 storage helpers.

---

## Inter-Process Communication (IPC) & Data Flow

```
 +------------------+            HTTP (REST)            +------------------+
 |                  | --------------------------------> |                  |
 |  web/ (Next.js)  |                                   |  server/ (API)   |
 |                  | <-------------------------------- |                  |
 +------------------+        Redis Pub/Sub Stream       +------------------+
          ^                                                      |
          |                                                      | Redis Enqueue
          |                                                      v
 +-------------------------------------------------------------------------+
 |                            REDIS INFRASTRUCTURE                         |
 |  Queues: ENGINE_LLM_REQUEST, worker queues | Channels: stream:<reqId>   |
 +-------------------------------------------------------------------------+
          |                                                      |
          v Redis Dequeue                                        v Redis Dequeue
 +------------------+                                   +------------------+
 |   llm/ (Engine)  |                                   | worker/ (Worker) |
 +------------------+                                   +------------------+
          |                                                      |
          +-------------------------+----------------------------+
                                    |
                                    v Shared Database Queries
                         +--------------------------+
                         |  PostgreSQL Database     |
                         | (packages/shared/Prisma) |
                         +--------------------------+
```

### Communication Protocols:
- **HTTP / REST:** Synchronous communication between `web/` and `server/`.
- **Redis Queues (`lpush`/`brpop`):** Asynchronous, decoupled producer-consumer messaging from `server/` to `worker/` and `llm/`.
- **Redis Pub/Sub (`publish`/`subscribe`):** Real-time streaming of LLM token chunks (`stream:<requestId>`) from `llm/` back to subscribers.
- **Shared PostgreSQL Database:** Managed exclusively via `@theweave/database` Prisma client wrappers. Direct raw connections from `web/` to Postgres are prohibited.

---

## Cross-Cutting Architectural Rules

### 1. Request Tracing & Log Context (`X-Request-ID`)
- Every HTTP request received by `server/` MUST generate or adopt an `X-Request-ID`.
- When enqueuing jobs to Redis, the `requestId` MUST be included in the job envelope payload.
- `worker/` and `llm/` automatic context wrappers MUST ingest `job.requestId` into `requestContext` (`AsyncLocalStorage`) so all logs and traces remain bound across process boundaries.

### 2. Multi-Tenant Isolation
- All database queries, cache keys, and queue payloads MUST enforce multi-tenant scoping (`organizationId`, `workspaceId`).
- Never perform global database mutations or tool executions without validating caller organization boundaries.

### 3. API & Queue Payload Contract Governance
- Treat API payloads, Redis queue envelopes, and database schemas as strict versioned contracts.
- When modifying a contract, update both producer and consumer in the same pull request/commit.
- Ensure backward compatibility for pending jobs in Redis queues.

### 4. Responsibilities & Execution Placement
- **`server/`:** Perform fast validation and CRUD (< 50ms). Never block Express event loops on slow AI or file operations.
- **`worker/`:** Handle retryable, scheduled, or deferred background tasks with strict idempotency.
- **`llm/`:** Isolate LLM API calls, prompt formatting, context window truncation, and ReAct tool loops.

### 5. Infrastructure & Environment Validation
- Centralize shared ORM schemas and DB connections inside `packages/shared/`.
- When adding environment variables, update the environment validator (`validateEnv()`) in all affected workspaces.

