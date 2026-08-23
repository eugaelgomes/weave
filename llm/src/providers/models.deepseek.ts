/**
 * @module weave-engine/providers/deepseek
 * @description DeepSeek API client.
 * DeepSeek uses an OpenAI-compatible wire format but has specific features:
 * - Thinking mode via `thinking.type: enabled/disabled` and `reasoning_effort: low|high|max`
 * - Returns `reasoning_content` in the response message (the chain-of-thought)
 * - Models: deepseek-v4-flash, deepseek-v4-pro
 */

import axios from "axios";
import type { LLMRequestParams, LLMResponse, ToolCallResult } from "@theweave/shared";
import { normalizeFiles } from "../utils/files";
import { parseAccumulatedToolCalls } from "../utils/streaming";

export async function callDeepseekProvider(params: LLMRequestParams): Promise<LLMResponse> {
  const { apiKey, model, baseURL } = params;

  if (!apiKey) {
    throw new Error("API key is required for DeepSeek");
  }

  const endpointUrl = baseURL
    ? `${baseURL.replace(/\/$/, "")}/chat/completions`
    : "https://api.deepseek.com/chat/completions";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // --- Build messages ---
  const messages: Record<string, unknown>[] = [];

  if (params.systemMessage) {
    messages.push({ content: params.systemMessage, role: "system" });
  }

  if (Array.isArray(params.messages)) {
    for (const msg of params.messages) {
      const clean: Record<string, unknown> = { role: msg.role };

      if (msg.content !== undefined && msg.content !== null) {
        clean.content = msg.content;
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        clean.tool_calls = msg.tool_calls.map((tc) => ({
          function: {
            arguments: tc.function.arguments,
            name: tc.function.name,
          },
          id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}`,
          type: "function",
        }));
      }

      if (msg.role === "tool") {
        clean.tool_call_id =
          msg.tool_call_id || `call_${Math.random().toString(36).substring(2, 11)}`;
        clean.content =
          typeof msg.content === "string"
            ? msg.content
            : msg.content == null
              ? "{}"
              : JSON.stringify(msg.content);
      }

      messages.push(clean);
    }
  }

  // --- Append user prompt + files as last user message ---
  const userContent: Record<string, unknown>[] = [];

  if (params.prompt) {
    userContent.push({ text: params.prompt, type: "text" });
  }

  const normalizedFiles = normalizeFiles(params.files);
  for (const file of normalizedFiles) {
    if (file.mimeType.startsWith("image/")) {
      userContent.push({
        image_url: { url: `data:${file.mimeType};base64,${file.base64Data}` },
        type: "image_url",
      });
    } else if (
      file.mimeType === "application/pdf" ||
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json"
    ) {
      try {
        const text = Buffer.from(file.base64Data, "base64").toString("utf-8");
        userContent.push({
          text: `\n\n--- FILE: ${file.name} ---\n${text}\n--- END ---`,
          type: "text",
        });
      } catch {
        /* skip */
      }
    }
  }

  if (userContent.length > 0) {
    messages.push({ content: userContent, role: "user" });
  }

  // --- Build request body ---
  const body: Record<string, unknown> = { messages, model };

  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.topP !== undefined) body.top_p = params.topP;
  if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;

  // DeepSeek thinking mode — uses thinking.type and reasoning_effort
  if (params.thinking) {
    const thinkingParam = params.thinking as unknown as Record<string, unknown>;
    if (thinkingParam.type === "enabled" || thinkingParam.enabled === true) {
      body.thinking = {
        budget_tokens: thinkingParam.budget_tokens || thinkingParam.budgetTokens || 8000,
        type: "enabled",
      };
      // reasoning_effort is mutually exclusive with thinking object
      // use thinking.budget_tokens instead
    } else if (thinkingParam.effort) {
      // reasoning_effort: low | high | max (for models like deepseek-r1)
      body.reasoning_effort = thinkingParam.effort;
    }
  }

  // Tools
  if (Array.isArray(params.tools) && params.tools.length > 0) {
    body.tools = params.tools;
    body.tool_choice = params.toolChoice ?? "auto";
  }

  if (params.extraParams) {
    Object.assign(body, params.extraParams);
  }

  // --- Streaming ---
  if (params.stream && params.onChunk) {
    const onChunk = params.onChunk;
    body.stream = true;
    // Request usage in the final streaming chunk
    body.stream_options = { include_usage: true };

    const response = await axios.post(endpointUrl, body, {
      headers,
      responseType: "stream",
      timeout: 180_000,
    });

    let fullContent = "";
    let reasoningContent = "";
    let finalUsage: Record<string, unknown> | null = null;
    let finalToolCalls: Array<{
      id?: string;
      type: string;
      function: { name: string; arguments: string };
    }> | null = null;
    let streamBuffer = "";

    for await (const chunk of response.data) {
      streamBuffer += chunk.toString();
      let newlineIndex: number;
      while ((newlineIndex = streamBuffer.indexOf("\n")) >= 0) {
        const line = streamBuffer.slice(0, newlineIndex).trim();
        streamBuffer = streamBuffer.slice(newlineIndex + 1);

        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;

        try {
          const parsed = JSON.parse(line.slice(6));
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.reasoning_content) {
            // Chain-of-thought tokens — stream to caller as structured event
            reasoningContent += delta.reasoning_content;
          }

          if (delta?.content) {
            fullContent += delta.content;
            onChunk(delta.content);
          }

          if (delta?.tool_calls) {
            if (!finalToolCalls) finalToolCalls = [];
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? (finalToolCalls.length > 0 ? finalToolCalls.length - 1 : 0);
              if (!finalToolCalls[idx]) {
                finalToolCalls[idx] = {
                  function: { arguments: "", name: "" },
                  id: tc.id,
                  type: "function",
                };
              }
              if (tc.id && !finalToolCalls[idx].id) finalToolCalls[idx].id = tc.id;
              if (tc.function?.name) finalToolCalls[idx].function.name += tc.function.name;
              if (tc.function?.arguments)
                finalToolCalls[idx].function.arguments += tc.function.arguments;
            }
          }

          if (parsed.usage) finalUsage = parsed.usage;
        } catch {
          /* ignore bad chunks */
        }
      }
    }

    const usage = finalUsage
      ? {
          inputTokens: (finalUsage.prompt_tokens as number) || 0,
          outputTokens: (finalUsage.completion_tokens as number) || 0,
          thinkingTokens:
            ((finalUsage.completion_tokens_details as Record<string, unknown>)
              ?.reasoning_tokens as number) || 0,
          totalTokens: (finalUsage.total_tokens as number) || 0,
        }
      : null;

    if (finalToolCalls && finalToolCalls.length > 0) {
      const toolCalls = parseAccumulatedToolCalls(finalToolCalls);
      return {
        functionCall: {
          arguments: toolCalls[0].arguments,
          name: toolCalls[0].name,
        },
        text: null,
        toolCallId: finalToolCalls[0].id,
        toolCalls,
        type: "function_call",
        usage,
      };
    }

    return { functionCall: null, text: fullContent, type: "text", usage };
  }

  // --- Non-streaming ---
  const response = await axios.post(endpointUrl, body, {
    headers,
    timeout: 180_000,
  });

  const msg = response.data.choices?.[0]?.message;
  const usageData = response.data.usage;
  const usage = usageData
    ? {
        inputTokens: usageData.prompt_tokens || 0,
        outputTokens: usageData.completion_tokens || 0,
        thinkingTokens: usageData.completion_tokens_details?.reasoning_tokens || 0,
        totalTokens: usageData.total_tokens || 0,
      }
    : null;

  if (msg?.tool_calls?.length) {
    const safeParse = (str: string): Record<string, unknown> => {
      try {
        return JSON.parse(str);
      } catch {
        return {};
      }
    };
    const first = msg.tool_calls[0];
    const toolCalls: ToolCallResult[] = msg.tool_calls.map((tc: Record<string, unknown>) => {
      const fn = (tc.function || {}) as Record<string, unknown>;
      return {
        arguments: safeParse(fn.arguments as string),
        id: tc.id as string,
        name: fn.name as string,
      };
    });
    return {
      functionCall: {
        arguments: safeParse((first.function as Record<string, unknown>).arguments as string),
        name: (first.function as Record<string, unknown>).name as string,
      },
      text: null,
      toolCallId: first.id as string,
      toolCalls,
      type: "function_call",
      usage,
    };
  }

  return {
    functionCall: null,
    text: msg?.content || "",
    type: "text",
    usage,
  };
}
