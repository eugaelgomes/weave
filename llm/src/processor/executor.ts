/**
 * @module weave-engine/processor/chat.engine
 * @description ReAct (Reasoning and Acting) agentic loop.
 * Iteratively calls the LLM, executes MCP tool calls, and feeds results back
 * until a final text answer is reached or an external tool call is returned.
 *
 * The LLM provider, model, apiKey, and all generation params are passed
 * via executionContext — nothing is hardcoded in the engine.
 */

import { LLMRequestParams } from "@/providers/normalizer";

// ToolSchema mirrors the OpenAI function-calling tool format
type ToolSchema = { type: string; function: { name: string; description?: string; parameters?: unknown } };
import {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
} from "@/routes/mcp-dispatcher";
import { Tracer } from "@/config/tracing";
import { AgenticExecutionContext } from "@/types/engine.types";
import { ModelFactoryOptions } from "@/types/models.types";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";

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
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Creates and configures a LangChain ChatModel instance based on the requested provider.
 */
export function createChatModel(options: ModelFactoryOptions): BaseChatModel {
  const { provider, model, apiKey, baseURL, thinking, streaming } = options;

  switch (provider.toLowerCase()) {
    case "anthropic":
      return new ChatAnthropic({
        apiKey,
        clientOptions: baseURL ? { baseURL } : undefined,
        maxTokens: thinking?.enabled && thinking.budgetTokens ? undefined : 4096,
        modelName: model,
        streaming: streaming ?? true,
        thinking: thinking?.enabled
          ? {
              budget_tokens: thinking.budgetTokens || 1024,
              type: "enabled",
            }
          : undefined,
      });

    case "deepseek":
      return new ChatOpenAI({
        configuration: { baseURL: baseURL || "https://api.deepseek.com" },
        maxTokens: 4096,
        modelName: model,
        openAIApiKey: apiKey,
        streaming: streaming ?? true,
      });

    case "kimi":
    case "moonshot":
      return new ChatOpenAI({
        configuration: { baseURL: baseURL || "https://api.moonshot.cn/v1" },
        maxTokens: 4096,
        modelName: model,
        openAIApiKey: apiKey,
        streaming: streaming ?? true,
      });

    case "xai":
    case "grok":
      return new ChatOpenAI({
        configuration: { baseURL: baseURL || "https://api.x.ai/v1" },
        maxTokens: 4096,
        modelName: model,
        openAIApiKey: apiKey,
        streaming: streaming ?? true,
      });

    case "openai":
    default:
      // Default to OpenAI-compatible provider
      return new ChatOpenAI({
        configuration: baseURL ? { baseURL } : undefined,
        maxTokens: 4096,
        modelName: model,
        openAIApiKey: apiKey,
        streaming: streaming ?? true,
      });
  }
}

function convertToLangChainMessages(
  systemMessage: string,
  history: unknown[],
  userMessage: string,
  files?: unknown[]
): BaseMessage[] {
  const lcMessages: BaseMessage[] = [];
  if (systemMessage) {
    lcMessages.push(new SystemMessage(systemMessage));
  }

  for (const msg of history as any[]) {
    if (msg.role === "user") {
      lcMessages.push(new HumanMessage({ content: msg.content }));
    } else if (msg.role === "assistant") {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        lcMessages.push(
          new AIMessage({
            content: msg.content || "",
            tool_calls: msg.tool_calls.map((t: any) => ({
              args:
                typeof t.function.arguments === "string"
                  ? JSON.parse(t.function.arguments)
                  : t.function.arguments,
              id: t.id,
              name: t.function.name,
            })),
          })
        );
      } else {
        lcMessages.push(new AIMessage({ content: msg.content || "" }));
      }
    } else if (msg.role === "tool") {
      lcMessages.push(
        new ToolMessage({
          content: msg.content || "",
          name: msg.name,
          tool_call_id: msg.tool_call_id,
        })
      );
    }
  }

  if (files && files.length > 0) {
    const contentParts: any[] = [{ text: userMessage, type: "text" }];
    for (const f of files as any[]) {
      if (f.type === "image_url") {
        contentParts.push({ image_url: { url: f.image_url.url }, type: "image_url" });
      }
    }
    lcMessages.push(new HumanMessage({ content: contentParts }));
  } else {
    lcMessages.push(new HumanMessage(userMessage));
  }

  return lcMessages;
}

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

  const availableTools: ToolSchema[] = [...(externalTools as ToolSchema[])];
  if (allowEdit) {
    const mcpTools = await getInternalToolDefinitions(executionContext as any);
    availableTools.push(...(mcpTools as ToolSchema[]));
  }

  const messages = convertToLangChainMessages(systemMessage, conversationHistory, message, files);

  let chatModel = createChatModel({
    apiKey: executionContext.apiKey,
    baseURL: executionContext.baseURL,
    model,
    provider: executionContext.provider,
    streaming: Boolean(executionContext.onChunk),
    thinking: executionContext.thinking
      ? {
          budgetTokens:
            typeof executionContext.thinking === "object"
              ? (executionContext.thinking as any).budget_tokens
              : undefined,
          enabled: true,
        }
      : undefined,
  });

  if (availableTools.length > 0) {
    chatModel = (chatModel as any).bindTools(availableTools as any);
  }

  const maxDurationMs = executionContext.maxDurationMs ?? MAX_AGENTIC_DURATION_MS;

  while (iterations < MAX_REACT_ITERATIONS) {
    if (Date.now() - startedAt >= maxDurationMs) {
      const isPt =
        typeof executionContext.language === "string" &&
        executionContext.language.toLowerCase().startsWith("pt");
      const msg = isPt
        ? "Atingi o limite de tempo interno da ferramenta e precisei parar o raciocínio."
        : "I hit the internal time limit for this task and had to stop early.";
      return {
        data: { content: msg, text: msg, type: "text" },
        executedActions,
        providerUsed: executionContext.provider,
      };
    }

    iterations++;

    let llmSpanId: string | undefined;
    if (executionContext.traceId && executionContext.organizationId) {
      llmSpanId = await Tracer.startSpan(
        { organizationId: executionContext.organizationId, traceId: executionContext.traceId },
        `llm_call:${model}`,
        "llm",
        { model }
      );
    }

    let aiMessage: AIMessage;
    try {
      if (executionContext.onChunk) {
        const stream = await chatModel.stream(messages);
        let fullMessage: AIMessage | null = null;
        for await (const chunk of stream) {
          if (!fullMessage) fullMessage = chunk as AIMessage;
          else fullMessage = (fullMessage as any).concat(chunk) as AIMessage;

          if (chunk.content) {
            executionContext.onChunk(chunk.content as string);
          }
        }
        aiMessage = fullMessage!;
      } else {
        aiMessage = (await chatModel.invoke(messages)) as AIMessage;
      }

      if (llmSpanId && executionContext.traceId && executionContext.organizationId) {
        await Tracer.endSpan(
          llmSpanId,
          { organizationId: executionContext.organizationId, traceId: executionContext.traceId },
          { completion_tokens: aiMessage.usage_metadata?.output_tokens || 0, status: "success" }
        );
      }
    } catch (err: unknown) {
      if (llmSpanId && executionContext.traceId && executionContext.organizationId) {
        await Tracer.endSpan(
          llmSpanId,
          { organizationId: executionContext.organizationId, traceId: executionContext.traceId },
          { error_message: (err as Error).message, status: "error" }
        );
      }
      throw err;
    }

    messages.push(aiMessage);

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const internalCalls = aiMessage.tool_calls.filter((t) => isInternalTool(t.name));
      const externalCalls = aiMessage.tool_calls.filter((t) => !isInternalTool(t.name));

      if (internalCalls.length > 0 && externalCalls.length === 0) {
        const results = await Promise.all(
          internalCalls.map(async (tc) => {
            if (executionContext.onChunk) {
              executionContext.onChunk({ name: tc.name, status: "running", type: "action_state" });
            }

            let spanId: string | undefined;
            if (executionContext.traceId && executionContext.organizationId) {
              spanId = await Tracer.startSpan(
                {
                  organizationId: executionContext.organizationId,
                  traceId: executionContext.traceId,
                },
                tc.name,
                "tool",
                tc.args
              );
            }

            try {
              const result = await executeInternalTool(
                tc.name,
                tc.args as any,
                executionContext as any
              );
              if (executionContext.onChunk)
                executionContext.onChunk({
                  name: tc.name,
                  status: "completed",
                  success: true,
                  type: "action_state",
                });
              if (spanId && executionContext.traceId && executionContext.organizationId) {
                await Tracer.endSpan(
                  spanId,
                  {
                    organizationId: executionContext.organizationId,
                    traceId: executionContext.traceId,
                  },
                  { output: result, status: "success" }
                );
              }
              return { error: null, result, tc };
            } catch (err: unknown) {
              const errorMessage = (err as Error).message;
              if (executionContext.onChunk)
                executionContext.onChunk({
                  name: tc.name,
                  status: "completed",
                  success: false,
                  type: "action_state",
                });
              if (spanId && executionContext.traceId && executionContext.organizationId) {
                await Tracer.endSpan(
                  spanId,
                  {
                    organizationId: executionContext.organizationId,
                    traceId: executionContext.traceId,
                  },
                  { error_message: errorMessage, status: "error" }
                );
              }
              return { error: errorMessage || "Tool execution failed", result: null, tc };
            }
          })
        );

        let circuitBreakerTripped = false;
        let failingToolName: string | null = null;

        for (const { tc, result, error } of results) {
          const signature = `${tc.name}:${JSON.stringify(tc.args)}`;
          if (error) {
            failureCounts[signature] = (failureCounts[signature] || 0) + 1;
            if (failureCounts[signature] >= 2) {
              circuitBreakerTripped = true;
              failingToolName = tc.name;
            }
          }
          const output = error ? { error } : result;
          executedActions.push({ args: tc.args, name: tc.name, result: output });
          messages.push(
            new ToolMessage({
              content: truncateToolOutput(output, 12000),
              name: tc.name,
              tool_call_id: tc.id!,
            })
          );
        }

        if (circuitBreakerTripped) {
          const msg =
            "Estou tendo problemas técnicos contínuos com a ferramenta " +
            (failingToolName || "") +
            " e não consegui concluir a tarefa. Por favor, tente novamente mais tarde.";
          return {
            data: { content: msg, text: msg, type: "text" },
            executedActions,
            providerUsed: executionContext.provider,
          };
        }
        continue;
      } else {
        return {
          data: {
            toolCalls: aiMessage.tool_calls.map((tc) => ({
              arguments: tc.args,
              id: tc.id,
              name: tc.name,
            })),
            type: "function_call",
          },
          executedActions,
          providerUsed: executionContext.provider,
        };
      }
    }

    return {
      data: {
        content:
          typeof aiMessage.content === "string"
            ? aiMessage.content
            : JSON.stringify(aiMessage.content),
        resolvedInternalTools: executedActions.length > 0 ? executedActions : undefined,
        text:
          typeof aiMessage.content === "string"
            ? aiMessage.content
            : JSON.stringify(aiMessage.content),
        type: "text",
      },
      executedActions,
      providerUsed: executionContext.provider,
    };
  }

  const isPt =
    typeof executionContext.language === "string" &&
    executionContext.language.toLowerCase().startsWith("pt");
  const fallbackMsg = isPt
    ? "Pensei por muitas iterações e não consegui chegar numa conclusão final."
    : "I thought for many iterations but couldn't reach a final conclusion.";

  return {
    data: {
      content: fallbackMsg,
      resolvedInternalTools: executedActions.length > 0 ? executedActions : undefined,
      text: fallbackMsg,
      type: "text",
    },
    executedActions,
    providerUsed: executionContext.provider,
  };
}
