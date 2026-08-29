# Background Worker Skill

Use this skill when inspecting, creating, or modifying asynchronous job processors and scheduled background tasks in the `worker/` directory.

The `worker/` workspace operates as an isolated, event-driven background service executing long-running computations, scheduled cron jobs, email dispatches, and system maintenance tasks independently of user-facing HTTP requests.

---

## Workspace Structure

The `worker/src/` directory is organized into the following components:

- `src/config/`: Infrastructure configuration, environment variable validation, and graceful shutdown handlers.
- `src/database/`: Database connection wrappers and pool management via `@theweave/database`.
- `src/instrument.js`: Sentry error monitoring and performance tracking initialization.
- `src/mail/`: Email templates, SMTP/Resend provider adapters, and layout formatters.
- `src/modules/`: Domain-specific background job processors (e.g., `backup`, `export`, `markdown`, `notes`, `notifications`, `organizations`, `plans`, `storage`, `tracing`, `weave-ai`).
- `src/queues/`: Queue key constants and Redis queue connection wrappers.
- `src/utils/`: Generic helper functions and formatting utilities.
- `src/app.js`: Central job registration registry and lifecycle orchestrator (`registerJob`, `initializeJobs`, `startAllJobs`, `stopAllJobs`).
- `src/index.js`: Worker process bootstrap, environment initialization, and signal handlers.

---

## Job Processor Architecture & Interface

Every background job processor module MUST export an object adhering to the standard processor interface:

```js
module.exports = {
  /**
   * Starts listening to the target Redis queue or scheduled timer.
   * @returns {Promise<void>}
   */
  async start() { ... },

  /**
   * Gracefully stops queue polling and active task ingestion.
   * @returns {void}
   */
  stop() { ... },

  /**
   * Processes an individual job payload.
   * @param {Object} job - The job payload enqueued by the producer.
   * @param {string} [job.requestId] - Optional request ID for log tracing context.
   * @returns {Promise<any>}
   */
  async processJob(job) { ... }
};
```

### Job Registration
All new job processors MUST be registered inside `src/app.js` under `initializeJobs()` using `registerJob(jobType, processor)`:
```js
registerJob("send_email", notifications.emailProcessor);
```
`registerJob` automatically wraps `processJob` with `@theweave/database`'s `requestContext` (`AsyncLocalStorage`) whenever `job.requestId` is present.

---

## Guidelines & Technical Rules

### 1. Strict Idempotency & Retry Safety
- Assume any background job may fail mid-execution and be retried by the queue system.
- Always verify data state before performing mutations (e.g., check if an email was already sent or if a payment was processed).
- Wrap database operations in transactions where atomicity is required.

### 2. Request Tracing & Context Propagation
- Preserve `requestId` from the job payload to ensure logs generated inside the worker are bound to the original HTTP request or trigger event.
- Use the shared logger from `@theweave/database`.

### 3. Graceful Shutdown Protocol
- Process shutdown is managed via `src/config/graceful-shutdown.js`.
- On `SIGTERM` or `SIGINT`, shutdown handlers execute in sequence:
  1. `processors`: Calls `stopAllJobs()` to halt incoming queue ingestion.
  2. `database`: Closes PostgreSQL connection pools safely.
  3. `sentry`: Flushes pending Sentry event buffers.

### 4. Mail & Dispatch Standards (`src/mail/`)
- Keep email templates, HTML wrappers, and provider logic centralized in `src/mail/`.
- Handle email provider errors defensively with retries and clear logging.

### 5. No HTTP Server Logic
- Never include Express routes or public HTTP listeners inside `worker/`. The worker's sole sources of work are Redis queues and PostgreSQL state.

### 6. Code Quality & Imports
- **No Barrel Files:** Use direct file path imports; do not create `index.js` re-export files within module subdirectories.
- **Documentation:** Write all comments, docstrings, and JSDoc strictly in English.
- **Shared Dependencies:** Import database and logger utilities from `@theweave/database` and shared helpers from `@theweave/shared`.

