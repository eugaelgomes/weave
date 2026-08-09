/**
 * @module weave-engine/providers/types
 * @description Shared types for the multi-provider LLM client.
 * Uses the OpenAI wire format as the internal contract.
 */

// ---------------------------------------------------------------------------
// Basic Types
// ---------------------------------------------------------------------------

export interface FileInput {
  base64Data?: string;
  mimeType: string;
  name: string;
}

export interface ThinkingConfig {
  type: "adaptive" | "enabled" | "disabled";
  effort?: "low" | "medium" | "high" | "max";
  budget_tokens?: number;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
  extra_content?: string;
}

export interface ToolCallResult {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
  extra_content?: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | unknown[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  extra_content?: string;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface LLMRequestParams {
  provider: string;
  apiKey: string;
  model: string;
  baseURL?: string;

  systemMessage?: string;
  messages?: Message[];
  prompt?: string;

  temperature?: number;
  maxTokens?: number;
  topP?: number;

  thinking?: ThinkingConfig;

  tools?: ToolSchema[];
  toolChoice?: "auto" | "required" | "none" | { type: "function"; function: { name: string } };

  stream?: boolean;
  onChunk?: (chunk: string | Record<string, unknown>) => void;

  files?: FileInput[];

  extraParams?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface LLMResponse {
  type: "text" | "function_call";
  text: string | null;
  functionCall: { name: string; arguments: Record<string, unknown> } | null;
  toolCalls?: ToolCallResult[];
  toolCallId?: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    totalTokens: number;
  } | null;
}
