# Express API and MCP Server Skill

Use this skill when inspecting, designing, or modifying code in the `server/` directory.

The `server/` workspace serves a dual purpose:
1. Primary REST API gateway for the frontend web application and third-party integrations.
2. Host for the Model Context Protocol (MCP) server allowing local and remote AI agents to query state and execute administrative tools.

---

## Workspace Structure

The `server/src/` workspace is organized into clear domain boundary directories:
- `src/config/`: Infrastructure, environment variable validation, Doppler secrets, and app configurations.
- `src/database/`: Database connections, Prisma client wrappers, and transaction context managers.
- `src/errors/`: Custom error hierarchy (`AppError`, `ValidationError`, `UnauthorizedError`) and global Express error middleware.
- `src/instrument.js`: Sentry initialization, performance monitoring, and tracing setup.
- `src/middlewares/`: Global & route-level Express middlewares (Auth, Rate Limiting, Request ID tracing, Zod Validation).
- `src/modules/`: Domain-driven feature modules (e.g., `authentication`, `users`, `workspaces`, `organizations`, `projects`, `notes`, `webhooks`, `agent-house`).
- `src/routes/`: Global HTTP router aggregators linking modules and system endpoints.
- `src/services/`: Shared integration wrappers (S3/storage, Redis pub/sub, external APIs, OAuth adapters).
- `src/utils/`: Pure helper functions and generic utilities.

---

## Domain Module Standards (`src/modules/<feature>/`)

Each domain module under `src/modules/` MUST adhere to a clear layered architecture:

- `<module>.controller.js`: Handles HTTP requests/responses, status code mapping, and delegates execution to the service layer. Controllers MUST remain thin.
- `<module>.service.js`: Contains core business logic, domain rules, transaction orchestrations, and event/queue dispatches.
- `<module>.repository.js`: Encapsulates database queries (Prisma / raw SQL). Services must never execute raw database queries directly.
- `<module>.schema.js`: Zod validation schemas for request `body`, `query`, and `params`. All schemas and fields MUST be defined in English.
- `<module>.routes.js`: Express router definitions attaching middleware (auth, validation) to controller methods.

---

## Guidelines & Architecture Rules

### 1. Minimal & Fast HTTP Handlers
- HTTP endpoints must process requests quickly (target < 50ms for standard CRUD operations).
- **Heavy or Asynchronous Operations:** Do NOT perform LLM calls, long processing tasks, or heavy background jobs directly within HTTP request handlers. Enqueue jobs into Redis queues using `@theweave/shared` to offload work to the `worker` or `llm` services.

### 2. Model Context Protocol (MCP) Integration
- Expose agent capabilities via standardized MCP tools, resources, and prompts over supported transports (e.g., SSE, stdio).
- Ensure all MCP tool executions apply strict tenant isolation (`organizationId`, `workspaceId`) and permission checks matching the REST API standards.

### 3. Authentication & Session Management
- Validate Access Tokens (JWT) using the central `auth.middleware`.
- Support secure Refresh Token rotation workflows and store refresh state safely.
- Inject authenticated context (`req.user`, `req.organizationId`) consistently via request middleware. Never trust unverified client-provided user IDs.

### 4. Standard Response Envelope & Error Handling
- Standardize REST JSON responses:
  - **Success:** `{ status: "success", data: <payload>, meta?: <pagination/metadata> }`
  - **Error:** `{ status: "error", error: { code: string, message: string, details?: array } }`
- Throw instances of `AppError` (or derived subclasses) in services and repositories. Allow the global error middleware in `src/errors/` to format error responses and map status codes appropriately.

### 5. Observability & Tracing
- Ensure every incoming request receives or propagates a unique `X-Request-ID`.
- Utilize `AsyncLocalStorage` log context wrappers to ensure request IDs and user IDs are appended to log statements automatically.
- Ensure Sentry (`instrument.js`) captures uncaught operational errors and traces database queries.

### 6. Code & Import Rules
- **No Barrel Files:** Avoid `index.js` re-exports inside modules or utility directories. Use explicit file path imports.
- **Documentation:** Write all comments, docstrings, and JSDoc strictly in English, technical and direct.
- **Dependencies:** Import shared packages strictly from `@theweave/shared` or `@theweave/database`. Do not duplicate shared utilities.

