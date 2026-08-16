/**
 * @module weave-engine/providers/openai
 * @description OpenAI-compatible API client.
 * Handles calls to OpenAI, Gemini, xAI, Azure, and any custom endpoint using the standard wire format.
 */

import axios from "axios";
import type { LLMRequestParams, LLMResponse, ToolCallResult } from "@theweave/shared";
import { normalizeFiles } from "../utils/files";
import { parseAccumulatedToolCalls } from "../utils/streaming";

export async function callOpenAICompatProvider(params: LLMRequestParams): Promise<LLMResponse> {
  const { apiKey, model, provider, baseURL } = params;

  if (!apiKey) {
    throw new Error(`API key is required for provider: ${provider}`);
  }

  let endpointUrl = baseURL
    ? `${baseURL.replace(/\/$/, "")}/chat/completions`
    : `https://api.openai.com/v1/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "azure") {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["api-key"] = apiKey;
    if (!endpointUrl.includes("api-version=")) {
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";
      endpointUrl += (endpointUrl.includes("?") ? "&" : "?") + `api-version=${apiVersion}`;
    }
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

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
          id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}`,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
          ...(tc.extra_content ? { extra_content: tc.extra_content } : {}),
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
    userContent.push({ type: "text", text: params.prompt });
  }

  const normalizedFiles = normalizeFiles(params.files);
  for (const file of normalizedFiles) {
    if (file.mimeType.startsWith("image/")) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${file.mimeType};base64,${file.base64Data}` },
      });
    } else if (
      file.mimeType === "application/pdf" ||
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json"
    ) {
      try {
        const text = Buffer.from(file.base64Data, "base64").toString("utf-8");
        userContent.push({
          type: "text",
          text: `\n\n--- FILE: ${file.name} ---\n${text}\n--- END ---`,
        });
      } catch {
        /* skip */
      }
    }
  }

  if (userContent.length > 0) {
    messages.push({ role: "user", content: userContent });
  }

  // --- Build request body ---
  const body: Record<string, unknown> = { model, messages };

  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.topP !== undefined) body.top_p = params.topP;

  // Max tokens — Gemini uses max_tokens, all others use max_completion_tokens
  const isGemini = endpointUrl.includes("generativelanguage.googleapis.com");
  if (params.maxTokens !== undefined) {
    body[isGemini ? "max_tokens" : "max_completion_tokens"] = params.maxTokens;
  }

  // Thinking (OpenAI o1/o3/o4 reasoning models)
  if (params.thinking?.effort && !isGemini) {
    body.reasoning_effort = params.thinking.effort;
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

    const response = await axios.post(endpointUrl, body, {
      headers,
      responseType: "stream",
      timeout: 120_000,
    });

    let fullContent = "";
    let finalUsage: Record<string, unknown> | null = null;
    let finalToolCalls: Array<{
      id?: string;
      type: string;
      function: { name: string; arguments: string };
      extra_content?: string;
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
                  id: tc.id,
                  type: "function",
                  function: { name: "", arguments: "" },
                };
              }
              if (tc.id && !finalToolCalls[idx].id) finalToolCalls[idx].id = tc.id;
              if (tc.extra_content) finalToolCalls[idx].extra_content = tc.extra_content;
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
          totalTokens: (finalUsage.total_tokens as number) || 0,
        }
      : null;

    if (finalToolCalls && finalToolCalls.length > 0) {
      const toolCalls = parseAccumulatedToolCalls(finalToolCalls);
      return {
        type: "function_call",
        text: null,
        functionCall: {
          name: toolCalls[0].name,
          arguments: toolCalls[0].arguments,
        },
        toolCallId: finalToolCalls[0].id,
        toolCalls,
        usage,
      };
    }

    return { type: "text", text: fullContent, functionCall: null, usage };
  }

  // --- Non-streaming ---
  const response = await axios.post(endpointUrl, body, {
    headers,
    timeout: 120_000,
  });

  const msg = response.data.choices?.[0]?.message;
  const usageData = response.data.usage;
  const usage = usageData
    ? {
        inputTokens: usageData.prompt_tokens || 0,
        outputTokens: usageData.completion_tokens || 0,
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
      const result: ToolCallResult = {
        id: tc.id as string,
        name: fn.name as string,
        arguments: safeParse(fn.arguments as string),
      };
      if (tc.extra_content) result.extra_content = tc.extra_content as string;
      return result;
    });
    return {
      type: "function_call",
      text: null,
      functionCall: {
        name: (first.function as Record<string, unknown>).name as string,
        arguments: safeParse((first.function as Record<string, unknown>).arguments as string),
      },
      toolCallId: first.id as string,
      toolCalls,
      usage,
    };
  }

  return {
    type: "text",
    text: msg?.content || "",
    functionCall: null,
    usage,
  };
}
