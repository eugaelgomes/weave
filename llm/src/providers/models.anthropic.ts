/**
 * @module weave-engine/providers/anthropic
 * @description Anthropic API client.
 * Translates the internal OpenAI wire format (messages, tool calls, thinking)
 * to Anthropic's native format, and normalizes the response back to the standard LLMResponse.
 */

import axios from "axios";
import type { LLMRequestParams, LLMResponse, ToolCallResult } from "@theweave/shared";

export async function callAnthropicProvider(params: LLMRequestParams): Promise<LLMResponse> {
  const { apiKey, model, baseURL } = params;

  if (!apiKey) {
    throw new Error("API key is required for Anthropic");
  }

  const endpointUrl = baseURL
    ? `${baseURL.replace(/\/$/, "")}/messages`
    : `https://api.anthropic.com/v1/messages`;

  const headers: Record<string, string> = {
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  // --- Build messages ---
  const messages: Record<string, unknown>[] = [];

  if (Array.isArray(params.messages)) {
    for (const msg of params.messages) {
      if (msg.role === "system") continue; // system goes in body.system

      if (msg.role === "tool") {
        messages.push({
          content: [
            {
              content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
              tool_use_id: msg.tool_call_id,
              type: "tool_result",
            },
          ],
          role: "user",
        });
        continue;
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        messages.push({
          content: msg.tool_calls.map((tc) => ({
            id: tc.id,
            input: (() => {
              try {
                return JSON.parse(tc.function.arguments);
              } catch {
                return {};
              }
            })(),
            name: tc.function.name,
            type: "tool_use",
          })),
          role: "assistant",
        });
        continue;
      }

      messages.push({ content: msg.content, role: msg.role });
    }
  }

  if (params.prompt) {
    messages.push({ content: params.prompt, role: "user" });
  }

  const body: Record<string, unknown> = {
    max_tokens: params.maxTokens ?? 4096,
    messages,
    model,
  };

  if (params.systemMessage) {
    body.system = params.systemMessage;
  }

  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.topP !== undefined) body.top_p = params.topP;

  // Thinking (Anthropic adaptive)
  if (params.thinking && params.thinking.type !== "disabled") {
    body.thinking = params.thinking;
    // When thinking is enabled, temperature must be 1
    body.temperature = 1;
  }

  // Tools
  if (Array.isArray(params.tools) && params.tools.length > 0) {
    body.tools = params.tools.map((t) => {
      const tool = t as { function: { name: string; description?: string; parameters?: unknown } };
      return {
        description: tool.function.description,
        input_schema: tool.function.parameters ?? { properties: {}, type: "object" },
        name: tool.function.name,
      };
    });
    if (params.toolChoice) {
      body.tool_choice =
        typeof params.toolChoice === "string" ? { type: params.toolChoice } : params.toolChoice;
    }
  }

  if (params.extraParams) {
    Object.assign(body, params.extraParams);
  }

  // --- Streaming ---
  if (params.stream && params.onChunk) {
    const onChunk = params.onChunk;
    body.stream = true;

    const response = await axios.post(endpointUrl, body, {
      headers,
      responseType: "stream",
      timeout: 120_000,
    });

    let fullContent = "";
    let thinkingTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let streamBuffer = "";
    const toolInputBuffers: Record<string, string> = {};
    const toolMeta: Record<string, { id: string; name: string }> = {};

    for await (const chunk of response.data) {
      streamBuffer += chunk.toString();
      let newlineIndex: number;

      while ((newlineIndex = streamBuffer.indexOf("\n")) >= 0) {
        const line = streamBuffer.slice(0, newlineIndex).trim();
        streamBuffer = streamBuffer.slice(newlineIndex + 1);

        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));

          if (evt.type === "content_block_start") {
            if (evt.content_block?.type === "tool_use") {
              const idx = String(evt.index);
              toolMeta[idx] = {
                id: evt.content_block.id,
                name: evt.content_block.name,
              };
              toolInputBuffers[idx] = "";
            }
          }

          if (evt.type === "content_block_delta") {
            const delta = evt.delta;
            const idx = String(evt.index);

            if (delta?.type === "text_delta") {
              fullContent += delta.text;
              onChunk(delta.text);
            }
            if (delta?.type === "input_json_delta") {
              toolInputBuffers[idx] = (toolInputBuffers[idx] || "") + delta.partial_json;
            }
          }

          if (evt.type === "message_delta" && evt.usage) {
            outputTokens = evt.usage.output_tokens || 0;
          }

          if (evt.type === "message_start" && evt.message?.usage) {
            inputTokens = evt.message.usage.input_tokens || 0;
            thinkingTokens = evt.message.usage.cache_read_input_tokens || 0;
          }
        } catch {
          /* ignore */
        }
      }
    }

    const toolIndices = Object.keys(toolMeta);
    if (toolIndices.length > 0) {
      const safeParse = (str: string): Record<string, unknown> => {
        try {
          return JSON.parse(str);
        } catch {
          return {};
        }
      };
      const toolCalls: ToolCallResult[] = toolIndices.map((idx) => ({
        arguments: safeParse(toolInputBuffers[idx] || "{}"),
        id: toolMeta[idx].id,
        name: toolMeta[idx].name,
      }));
      return {
        functionCall: { arguments: toolCalls[0].arguments, name: toolCalls[0].name },
        text: null,
        toolCallId: toolCalls[0].id,
        toolCalls,
        type: "function_call",
        usage: {
          inputTokens,
          outputTokens,
          thinkingTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    }

    return {
      functionCall: null,
      text: fullContent,
      type: "text",
      usage: {
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }

  // --- Non-streaming ---
  const response = await axios.post(endpointUrl, body, {
    headers,
    timeout: 120_000,
  });

  const msg = response.data;
  const usageRaw = msg.usage || {};
  const usage = {
    inputTokens: usageRaw.input_tokens || 0,
    outputTokens: usageRaw.output_tokens || 0,
    thinkingTokens: usageRaw.cache_read_input_tokens || 0,
    totalTokens: (usageRaw.input_tokens || 0) + (usageRaw.output_tokens || 0),
  };

  const toolUseBlocks = (msg.content || []).filter(
    (b: Record<string, unknown>) => b.type === "tool_use"
  );

  if (toolUseBlocks.length > 0) {
    const toolCalls: ToolCallResult[] = toolUseBlocks.map((b: Record<string, unknown>) => ({
      arguments: (b.input as Record<string, unknown>) || {},
      id: b.id as string,
      name: b.name as string,
    }));
    return {
      functionCall: { arguments: toolCalls[0].arguments, name: toolCalls[0].name },
      text: null,
      toolCallId: toolCalls[0].id,
      toolCalls,
      type: "function_call",
      usage,
    };
  }

  const textBlock = (msg.content || []).find((b: Record<string, unknown>) => b.type === "text");

  return {
    functionCall: null,
    text: (textBlock?.text as string) || "",
    type: "text",
    usage,
  };
}
