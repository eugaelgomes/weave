/**
 * @module weave-engine/processor/chat.engine
 * @description ReAct (Reasoning and Acting) agentic loop.
 * Iteratively calls the LLM, executes MCP tool calls, and feeds results back
 * until a final text answer is reached or an external tool call is returned.
 *
 * The LLM provider, model, apiKey, and all generation params are passed
 * via executionContext — nothing is hardcoded in the engine.
 */

import {
  callAIProvider,
  LLMRequestParams,
  Message,
  ToolCallResult,
  ToolSchema,
} from "@/providers/normalizer";
import {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
} from "@/tools/mcp-dispatcher";
import { Tracer } from "@/core/tracing";

const MAX_REACT_ITERATIONS = Number.parseInt(
  process.env.WEAVE_ENGINE_MAX_REACT_ITERATIONS || "4",
  10
);
const MAX_AGENTIC_DURATION_MS = Number.parseInt(
  process.env.WEAVE_ENGINE_CHAT_TASK_TIMEOUT_MS || "65000",
  10
);

// ---------------------------------------------------------------------------
// Tool output truncation
// ---------------------------------------------------------------------------

function truncateToolOutput(output: unknown, maxLength: number): string {
  if (typeof output === "string") {
    return output.length <= maxLength
      ? output
      : output.slice(0, maxLength) + "\n\n...[TRUNCATED BY ENGINE DUE TO SIZE LIMITS]";
  }

  const jsonStr = JSON.stringify(output);
  if (jsonStr.length <= maxLength) return jsonStr;

  if (Array.isArray(output)) {
    let sliced = [...output];
    while (sliced.length > 0 && JSON.stringify(sliced).length > maxLength) {
      sliced = sliced.slice(0, Math.max(1, Math.floor(sliced.length / 2)));
      if (sliced.length === 1 && JSON.stringify(sliced).length > maxLength) break;
    }
    sliced.push({ _warning: "Results truncated by engine due to size limits." });
    const finalStr = JSON.stringify(sliced);
    if (finalStr.length <= maxLength + 500) return finalStr;
  }

  return jsonStr.slice(0, maxLength) + "\n\n...[TRUNCATED - INVALID JSON SYNTAX]";
}

// ---------------------------------------------------------------------------
// Execution context — all provider config comes from here
// ---------------------------------------------------------------------------

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
  /** Organization ID for MCP context. */
  organizationId?: string | null;
  /** Active trace ID for tracing integration. */
  traceId?: string;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function executeTask({
  allowEdit,
  _allowWebSearch,
  files = [],
  tools: externalTools = [],
  message,
  model,
  systemMessage,
  conversationHistory = [],
  executionContext,
}: {
  allowEdit: boolean;
  _allowWebSearch: boolean;
  files?: unknown[];
  tools?: unknown[];
  message: string;
  model: string;
  systemMessage: string;
  conversationHistory?: unknown[];
  executionContext: AgenticExecutionContext;
}): Promise<Record<string, unknown>> {
  let iterations = 0;
  const startedAt = Date.now();
  const executedActions: Record<string, unknown>[] = [];
  const failureCounts: Record<string, number> = {};

  // Combine external tools passed by API with MCP internal tools
  const availableTools: ToolSchema[] = [...(externalTools as ToolSchema[])];
  if (allowEdit) {
    const mcpTools = await getInternalToolDefinitions(executionContext as any);
    availableTools.push(...(mcpTools as ToolSchema[]));
  }

  // Build the message history: history + initial user message
  const messages: Message[] = [
    ...(conversationHistory as Message[]),
    { content: message, role: "user" },
  ];

  let providerUsed: string | null = null;
  const maxDurationMs = executionContext.maxDurationMs ?? MAX_AGENTIC_DURATION_MS;

  // ---------------------------------------------------------------------------
  // ReAct loop
  // ---------------------------------------------------------------------------
  while (iterations < MAX_REACT_ITERATIONS) {
    if (Date.now() - startedAt >= maxDurationMs) {
      const isPt =
        typeof executionContext.language === "string" &&
        executionContext.language.toLowerCase().startsWith("pt");
      const msg = isPt
        ? "Atingi o limite de tempo interno da ferramenta e precisei parar o raciocínio. Fique à vontade para me pedir para continuar!"
        : "I hit the internal time limit for this task and had to stop early. Feel free to ask me to continue!";
      return { data: { content: msg, text: msg, type: "text" }, executedActions, providerUsed };
    }

    iterations++;

    let llmSpanId: string | undefined;
    if (executionContext.traceId && executionContext.organizationId) {
      llmSpanId = await Tracer.startSpan(
        { traceId: executionContext.traceId, organizationId: executionContext.organizationId },
        `llm_call:${model}`,
        "llm",
        { systemMessage, messages, model }
      );
    }

    let providerRes: { data: any; provider: string };
    try {
      providerRes = await callAIProvider({
        apiKey: executionContext.apiKey,
        baseURL: executionContext.baseURL,
        files: files as LLMRequestParams["files"],
        messages,
        model,
        onChunk: executionContext.onChunk,
        provider: executionContext.provider,
        stream: Boolean(executionContext.onChunk),
        systemMessage,
        thinking: executionContext.thinking,
        toolChoice: availableTools.length > 0 ? "auto" : undefined,
        tools: availableTools.length > 0 ? availableTools : undefined,
      });

      if (llmSpanId && executionContext.traceId && executionContext.organizationId) {
        await Tracer.endSpan(
          llmSpanId,
          { traceId: executionContext.traceId, organizationId: executionContext.organizationId },
          {
            status: "success",
            output: providerRes.data,
            prompt_tokens: providerRes.data?.usage?.inputTokens || 0,
            completion_tokens: providerRes.data?.usage?.outputTokens || 0,
            model: providerRes.provider || model,
          }
        );
      }
    } catch (err: unknown) {
      if (llmSpanId && executionContext.traceId && executionContext.organizationId) {
        await Tracer.endSpan(
          llmSpanId,
          { traceId: executionContext.traceId, organizationId: executionContext.organizationId },
          {
            status: "error",
            error_message: (err as Error).message || "LLM Provider call failed",
          }
        );
      }
      throw err;
    }

    const { data, provider } = providerRes;

    providerUsed = provider;

    // -----------------------------------------------------------------------
    // Tool call branch
    // -----------------------------------------------------------------------
    if (data.type === "function_call" && data.toolCalls) {
      const toolCallsArray = data.toolCalls.map((tc: ToolCallResult, idx: number) => ({
        extra_content: tc.extra_content,
        function: {
          arguments: JSON.stringify(tc.arguments),
          name: tc.name,
        },
        id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}_${idx}`,
        rawArgs: tc.arguments,
      }));

      // Append assistant tool_call message to history
      messages.push({
        content: null,
        role: "assistant",
        tool_calls: toolCallsArray.map((t) => ({
          function: t.function,
          id: t.id,
          ...(t.extra_content ? { extra_content: t.extra_content } : {}),
        })) as Message["tool_calls"],
      });

      const internalCalls = toolCallsArray.filter((t) => isInternalTool(t.function.name));
      const externalCalls = toolCallsArray.filter((t) => !isInternalTool(t.function.name));

      if (internalCalls.length > 0 && externalCalls.length === 0) {
        // Execute all internal (MCP) tools in parallel
        const results = await Promise.all(
          internalCalls.map(async (tc) => {
            const fnName = tc.function.name;
            const fnArgs = tc.rawArgs as Record<string, unknown>;

            if (executionContext.onChunk) {
              executionContext.onChunk({ name: fnName, status: "running", type: "action_state" });
            }

            let spanId: string | undefined;
            if (executionContext.traceId && executionContext.organizationId) {
              spanId = await Tracer.startSpan(
                {
                  traceId: executionContext.traceId,
                  organizationId: executionContext.organizationId,
                },
                fnName,
                "tool",
                fnArgs
              );
            }

            try {
              const result = await executeInternalTool(fnName, fnArgs, executionContext as any);
              if (executionContext.onChunk) {
                executionContext.onChunk({
                  name: fnName,
                  status: "completed",
                  success: true,
                  type: "action_state",
                });
              }
              if (spanId && executionContext.traceId && executionContext.organizationId) {
                await Tracer.endSpan(
                  spanId,
                  {
                    traceId: executionContext.traceId,
                    organizationId: executionContext.organizationId,
                  },
                  {
                    status: "success",
                    output: result,
                  }
                );
              }
              return { error: null, result, tc };
            } catch (err: unknown) {
              const errorMessage = (err as Error).message;
              if (executionContext.onChunk) {
                executionContext.onChunk({
                  name: fnName,
                  status: "completed",
                  success: false,
                  type: "action_state",
                });
              }
              if (spanId && executionContext.traceId && executionContext.organizationId) {
                await Tracer.endSpan(
                  spanId,
                  {
                    traceId: executionContext.traceId,
                    organizationId: executionContext.organizationId,
                  },
                  {
                    status: "error",
                    error_message: errorMessage,
                  }
                );
              }
              return { error: errorMessage || "Tool execution failed", result: null, tc };
            }
          })
        );

        let circuitBreakerTripped = false;
        let failingToolName: string | null = null;

        for (const { tc, result, error } of results) {
          const fnName = tc.function.name;
          const fnArgs = tc.rawArgs as Record<string, unknown>;

          if (error) {
            const signature = `${fnName}:${JSON.stringify(fnArgs)}`;
            failureCounts[signature] = (failureCounts[signature] || 0) + 1;
            if (failureCounts[signature] >= 2) {
              circuitBreakerTripped = true;
              failingToolName = fnName;
            }
          }

          const output = error ? { error } : result;
          executedActions.push({ args: fnArgs, name: fnName, result: output });

          messages.push({
            content: truncateToolOutput(output, 12000),
            name: fnName,
            role: "tool",
            tool_call_id: tc.id,
          });
        }

        if (circuitBreakerTripped) {
          const msg =
            "Estou tendo problemas técnicos contínuos com a ferramenta " +
            (failingToolName || "") +
            " e não consegui concluir a tarefa. Por favor, reformule o pedido ou tente novamente mais tarde.";
          return { data: { content: msg, text: msg, type: "text" }, executedActions, providerUsed };
        }

        continue; // Loop back with tool results appended
      } else {
        // External tool calls — return to API for execution
        return { data, executedActions, functions: data.toolCalls, providerUsed };
      }
    }

    // Fallback single functionCall (legacy compat)
    if (data.type === "function_call" && data.functionCall) {
      const fnName = data.functionCall.name;
      const fnArgs = data.functionCall.arguments;
      const toolCallId = data.toolCallId || `call_${Math.random().toString(36).substring(2, 11)}`;

      messages.push({
        content: null,
        role: "assistant",
        tool_calls: [
          {
            function: { arguments: JSON.stringify(fnArgs), name: fnName },
            id: toolCallId,
            type: "function",
          },
        ],
      });

      if (isInternalTool(fnName)) {
        if (executionContext.onChunk) {
          executionContext.onChunk({ name: fnName, status: "running", type: "action_state" });
        }

        let result: unknown = null;
        let error: string | null = null;
        try {
          result = await executeInternalTool(fnName, fnArgs, executionContext as any);
          if (executionContext.onChunk) {
            executionContext.onChunk({
              name: fnName,
              status: "completed",
              success: true,
              type: "action_state",
            });
          }
        } catch (err: unknown) {
          error = (err as Error).message || "Tool execution failed";
          if (executionContext.onChunk) {
            executionContext.onChunk({
              name: fnName,
              status: "completed",
              success: false,
              type: "action_state",
            });
          }
        }

        if (error) {
          const signature = `${fnName}:${JSON.stringify(fnArgs)}`;
          failureCounts[signature] = (failureCounts[signature] || 0) + 1;
          if (failureCounts[signature] >= 2) {
            const msg =
              "Estou tendo problemas técnicos contínuos com a ferramenta " +
              fnName +
              " e não consegui concluir a tarefa. Por favor, tente de novo mais tarde.";
            return {
              data: { content: msg, text: msg, type: "text" },
              executedActions,
              providerUsed,
            };
          }
        }

        const output = error ? { error } : result;
        executedActions.push({ args: fnArgs, name: fnName, result: output });
        messages.push({
          content: truncateToolOutput(output, 12000),
          name: fnName,
          role: "tool",
          tool_call_id: toolCallId,
        });
        continue;
      } else {
        return {
          data,
          executedActions,
          functions: [{ arguments: fnArgs, id: toolCallId, name: fnName }],
          providerUsed,
        };
      }
    }

    // -----------------------------------------------------------------------
    // Text response — done
    // -----------------------------------------------------------------------
    return {
      data: {
        ...data,
        resolvedInternalTools: executedActions.length > 0 ? executedActions : undefined,
      },
      executedActions,
      providerUsed,
    };
  }

  // Max iterations reached
  const isPt =
    typeof executionContext.language === "string" &&
    executionContext.language.toLowerCase().startsWith("pt");
  const fallbackMsg = isPt
    ? "Pensei por muitas iterações e não consegui chegar numa conclusão final. Pode me dar mais detalhes?"
    : "I thought for many iterations but couldn't reach a final conclusion. Could you provide more details?";

  return {
    data: {
      content: fallbackMsg,
      resolvedInternalTools: executedActions.length > 0 ? executedActions : undefined,
      text: fallbackMsg,
      type: "text",
    },
    executedActions,
    providerUsed,
  };
}
