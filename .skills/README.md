# Weave Engineering Skills Index

This directory contains essential architectural principles, boundaries, and practical engineering guidance for AI agents and human contributors working on the Weave platform.

Before inspecting or modifying code in any specific workspace, contributors MUST refer to the corresponding skill document to adhere to workspace-specific patterns and constraints.

---

## Workspace Skill Mapping

| Area | Workspace Path | Skill Document | Core Technologies |
| --- | --- | --- | --- |
| **System Overall** | `/*` | [architecture.md](architecture.md) | System Design, IPC, Shared State |
| **Express REST API** | `server/` | [server.md](server.md) | Express, MCP Server, Zod, Auth |
| **Next.js Frontend App** | `web/` | [frontend.md](frontend.md) | Next.js (App Router), Tailwind CSS, SWR |
| **AI Execution Engine** | `llm/` | [llm.md](llm.md) | TypeScript, ReAct Loop, Multi-LLM, Redis Pub/Sub |
| **Redis Job Worker** | `worker/` | [worker.md](worker.md) | Background Queues, Cron, Resend/Mail |
| **Shared Core Library** | `packages/shared/` | Managed via `architecture.md` | `@theweave/database` (Prisma, Redis, Logging) |

---

## Global Contribution Rules

1. **English Language Standard:** Write ALL code comments, documentation, commit messages, and JSDoc annotations strictly in English.
2. **JSDoc Mandatory:** Add complete JSDoc annotations to all exported functions, classes, interfaces, types, and non-trivial variables.
3. **No Barrel Files:** Do NOT create `index.ts` or `index.js` re-export files inside feature subdirectories. Always use explicit file path imports to prevent trace breakages and bundler clutter.
4. **Explicit Imports:** Name the target file explicitly in import statements (e.g., `import { executeTask } from "@/processor/executor"`).
5. **Zero Secret Leaks:** NEVER commit environment files (`.env`), Doppler secrets, API keys, local database dumps, or credentials under any circumstances.
6. **Scoped Edits:** Keep code changes fully scoped to the requested user prompt or issue. Avoid unrequested refactoring outside the task scope.
7. **No Dependency Hallucination:** Verify that any imported module is available under `packages/shared/` (`@theweave/database`) or explicitly listed in the target workspace's `package.json`.