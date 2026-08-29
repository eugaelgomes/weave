# LLM Engine Skill

Use this skill when inspecting, adding providers to, or modifying the AI Execution Engine in the `llm/` directory.

The `llm/` workspace is a high-performance TypeScript execution engine responsible for calling large language model providers (OpenAI, Anthropic, DeepSeek, Kimi, xAI), resolving MCP tool calls, executing ReAct reasoning loops, and streaming responses over Redis Pub/Sub.

---

## Workspace Structure

The `llm/src/` workspace uses TypeScript path aliases (`@/*`) and is organized as follows:

- `src/config/`: Engine environments (`@/config/enviroments`), logger setup, and graceful shutdown handlers (`@/config/shutdown`).
- `src/instrument.ts`: Sentry error monitoring and performance tracking initialization.
- `src/processor/`: Core ReAct agentic execution loop (`executor.ts`) for tool calling and context compilation.
- `src/providers/`: Connectors and SDK adapters for LLM providers (`models.openai.ts`, `models.anthropic.ts`, `models.deepseek.ts`, `models.kimi.ts`, `models.xai.ts`) and unified response normalizer (`normalizer.ts`).
- `src/queues/`: Queue consumers listening on Redis queues like `ENGINE_LLM_REQUEST`.
- `src/routes/`: Queue routing engine (`queue.routes.ts`) handling job envelopes, retries, and task routing.
- `src/types/`: Strict TypeScript definitions mapping tool schemas, task contexts, and provider responses (`engine.types.ts`).
- `src/utils/`: Prompt parsers, string truncators, and stream helpers.

---

## Execution Modes & Task Types

The engine receives Redis queue jobs wrapped in a standardized envelope and routes execution based on `taskType`:

### 1. Direct Call (`taskType: "provider_call"`)
- Performs a single, synchronous LLM invocation without tool resolution loops.
- Used for quick summarizations, classification, or entity extraction.
- Calls `callLLMProvider()` from `@/providers/normalizer`.

### 2. Agentic ReAct Loop (`taskType: "chat_process"`)
- Executes a full multi-turn ReAct reasoning loop with tool resolution.
- Resolves and executes Model Context Protocol (MCP) tools dynamically.
- Publishes real-time output chunks to Redis channel `stream:<requestId>`.
- Enforces execution timeouts (`ENGINE_CHAT_TASK_TIMEOUT_MS`).

---

## Multi-Provider Support & Normalization

All LLM provider interactions MUST pass through normalized adapters in `src/providers/`:

- **Supported Providers:** `openai`, `anthropic`, `deepseek`, `kimi`, `xai`.
- **Response Protocol:** Each provider connector MUST convert provider-specific payloads into a unified internal format returning `{ data, provider: providerUsed }`.
- **Fallback Resilience:** Implement retries and fallback options when primary model endpoints time out or hit rate limits.

---

## Guidelines & Architecture Rules

### 1. Asynchronous Event-Driven Architecture
- The engine operates strictly as a background queue consumer. Do NOT expose public HTTP endpoints directly in `llm/`.
- All jobs enter via Redis `brpop` on `REDIS_QUEUE_KEYS.ENGINE_LLM_REQUEST` and return results via response queues specified in `job.responseQueueKey`.

### 2. Streaming via Redis Pub/Sub
- When processing `chat_process` tasks, emit streaming tokens using `redis.publish("stream:<requestId>", JSON.stringify({ chunk }))`.

### 3. Context Truncation & Markdown Awareness
- Apply strict character limits to conversation history to prevent context window overflow.
- Use intelligent truncation (`intelligentTruncate`) to avoid breaking open markdown code blocks (ensuring matching triple backticks ```` ` ````).

### 4. Observability & Token Metrics
- Track token usage and estimated costs using the `Tracer` helper.
- Record start and end trace events with `organizationId`, `userId`, `sessionId`, and `traceId`.

### 5. Dead Letter Queue & Error Normalization
- Jobs failing after maximum attempts (`ENGINE_JOB_MAX_RETRIES`) MUST be pushed to the Dead Letter Queue (`weave:engine:llm:dead-letter`).
- Normalize errors into standard shapes `{ code, message, taskType }`.

### 6. TypeScript & Code Standards
- **Imports:** Use path aliases (`@/providers`, `@/config`, `@/processor`).
- **No Barrel Files:** Import directly from specific TypeScript files (e.g. `import { callLLMProvider } from "@/providers/normalizer"`).
- **Documentation:** Write all code comments and JSDoc strictly in English.

