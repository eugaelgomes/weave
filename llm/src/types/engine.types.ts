import type { LLMRequestParams } from "@theweave/shared";

/**
 * Main execution context for the Agentic Loop (ReAct/Tool Calling)
 */
export interface AgenticExecutionContext {
  /** LLM provider (e.g. "openai", "anthropic", "gemini", "xai"). */
  provider: string;
  /** API key for the provider. */
  apiKey: string;
  /** Override base URL (optional, for Azure or custom endpoints). */
  baseURL?: string;
  /** Thinking/reasoning config. */
  thinking?: LLMRequestParams["thinking"];
  /** Language for timeout/fallback messages. */
  language?: string;
  /** Max execution duration in ms. */
  maxDurationMs?: number;
  /** Streaming callback — publishes chunks via redis.publish. */
  onChunk?: (chunk: string | Record<string, unknown>) => void;
  /** User ID for MCP context. */
  userId?: string | null;
  /** Worksapceanization ID for MCP context. */
  workspaceId?: string | null;
  /** Active trace ID for tracing integration. */
  traceId?: string;
}
