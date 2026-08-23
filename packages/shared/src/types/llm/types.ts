/**
 * @module @theweave/shared/types/llm
 * @description Shared type contracts for the Weave LLM Engine.
 * Used by `weave-engine` providers, processors, and external consumers.
 */

export interface FileInput {
  /** Raw base64-encoded file data (or data URL) */
  base64Data?: string;
  base64?: string;
  data?: string;
  content?: string;
  buffer?: string;
  mimeType?: string;
  mimetype?: string;
  name?: string;
  originalName?: string;
}

export interface ToolCallResult {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
  extra_content?: string;
}

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id?: string;
    type: string;
    function: { name: string; arguments: string };
    extra_content?: string;
  }>;
  tool_call_id?: string;
}

export interface LLMRequestParams {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  prompt?: string;
  systemMessage?: string;
  messages?: Message[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  tools?: unknown[];
  toolChoice?: string;
  files?: FileInput[];
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  thinking?: {
    /** Anthropic native thinking object */
    type?: "enabled" | "disabled";
    budget_tokens?: number;
    /** OpenAI-style reasoning effort */
    effort?: "low" | "medium" | "high";
    budget?: number;
  };
  extraParams?: Record<string, unknown>;
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Anthropic extended thinking tokens consumed */
  thinkingTokens?: number;
}

export interface LLMResponse {
  type: "text" | "function_call";
  text: string | null;
  functionCall: {
    name: string;
    arguments: Record<string, unknown>;
  } | null;
  toolCallId?: string;
  toolCalls?: ToolCallResult[];
  usage: LLMUsage | null;
}
