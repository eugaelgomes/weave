/**
 * @module weave-engine/modules/core/providers/llm-provider.client
 * @description Centralized HTTP client for interacting with external AI providers (OpenAI, Gemini).
 * Handles prompt formatting, message normalization, tool schema translation, and streaming execution.
 *
 * Dependencies:
 * - `axios`: For HTTP requests.
 * - `../../../services/llm.client`: For credential management and provider routing.
 */
import axios from "axios";
import {
  AI_PROVIDERS,
  getProviderByModelName,
  getProviderConfig,
  normalizeModelName,
  resolveDefaultModelName,
  AiProvider,
  ProviderConfig,
} from "./llm.client";
import { PDFParse } from "pdf-parse";
import { z } from "zod";

const ProviderResponseSchema = z
  .object({
    functionCall: z
      .object({
        arguments: z.record(z.string(), z.any()),
        name: z.string(),
      })
      .nullable(),
    text: z.string().nullable(),
    toolCallId: z.string().optional(),
    toolCalls: z
      .array(
        z
          .object({
            arguments: z.record(z.string(), z.any()),
            extra_content: z.string().optional(),
            id: z.string(),
            name: z.string(),
          })
          .passthrough()
      )
      .optional(),
    type: z.enum(["text", "function_call"]),
    usage: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
      })
      .nullable(),
  })
  .passthrough();

export type ProviderResponse = z.infer<typeof ProviderResponseSchema>;

const MAX_INLINE_FILES_PER_REQUEST = Number.parseInt(
  process.env.WEAVE_MAX_INLINE_FILES_PER_REQUEST || "3",
  10
);

/**
 * @param {unknown} maybeBase64
 * @returns {string}
 */
function normalizeBase64Data(maybeBase64: unknown): string {
  if (typeof maybeBase64 !== "string") {
    return "";
  }

  const trimmed = maybeBase64.trim();
  if (!trimmed) {
    return "";
  }

  const dataUrlMatch = trimmed.match(/^data:[^;]+;base64,(.+)$/i);
  return (dataUrlMatch?.[1] || trimmed).replace(/\s+/g, "");
}

interface NormalizedFile {
  base64Data: string;
  mimeType: string;
  name: string;
}

/**
 * @param {any} rawFile
 * @returns {{name: string, mimeType: string, base64Data: string}|null}
 */
function normalizeFileInput(rawFile: Record<string, unknown>): NormalizedFile | null {
  if (!rawFile || typeof rawFile !== "object") {
    return null;
  }

  const mimeType =
    typeof rawFile.mimeType === "string" && rawFile.mimeType.trim().length > 0
      ? rawFile.mimeType.trim()
      : typeof rawFile.mimetype === "string" &&
          rawFile.mimetype.trim().length > 0
        ? rawFile.mimetype.trim()
        : "application/octet-stream";
  const name =
    typeof rawFile.name === "string" && rawFile.name.trim().length > 0
      ? rawFile.name.trim()
      : typeof rawFile.originalName === "string" &&
          rawFile.originalName.trim().length > 0
        ? rawFile.originalName.trim()
        : typeof rawFile.filename === "string" &&
            rawFile.filename.trim().length > 0
          ? rawFile.filename.trim()
          : "file";

  const inlineData = normalizeBase64Data(
    rawFile.base64Data ||
      rawFile.base64 ||
      rawFile.data ||
      rawFile.content ||
      rawFile.buffer
  );

  if (!inlineData) {
    return null;
  }

  return {
    base64Data: inlineData,
    mimeType,
    name,
  };
}

/**
 * @param {any} files
 * @returns {Array<{name: string, mimeType: string, base64Data: string}>}
 */
function normalizeFiles(files: unknown[]): NormalizedFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return files
    .slice(0, MAX_INLINE_FILES_PER_REQUEST)
    .map((file) => normalizeFileInput(file))
    .filter((file): file is NormalizedFile => file !== null);
}

/**
 * @param {string} mimeType
 * @returns {boolean}
 */
function isImageMimeType(mimeType: string): boolean {
  return (
    typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/")
  );
}

function createProviderError(code: string, message: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

async function callGenericApi(
  prompt: string,
  systemMessage: string,
  config: ProviderConfig,
  options: Record<string, unknown> = {},
  modelName?: string
): Promise<ProviderResponse> {
  if (!config.apiKey) {
    throw createProviderError(
      "ENGINE_OPENAI_API_KEY_MISSING",
      "OPENAI_API_KEY is required to call OpenAI provider"
    );
  }

  const isAzureOpenAI = config.baseURL.includes(".openai.azure.com");
  const isAzureFoundry = config.baseURL.includes("services.ai.azure.com");

  let endpointUrl: string;
  if (isAzureOpenAI) {
    endpointUrl = `${config.baseURL}/chat/completions?api-version=2024-05-01-preview`;
  } else {
    endpointUrl = `${config.baseURL}/chat/completions`;
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isAzureOpenAI || isAzureFoundry) {
    // Both support api-key, Foundry also supports Bearer.
    requestHeaders["api-key"] = config.apiKey;
    requestHeaders["Authorization"] = `Bearer ${config.apiKey}`;
  } else {
    requestHeaders["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const normalizedFiles = normalizeFiles(options.files);
  const userContent: Record<string, unknown>[] = [];
  if (prompt) {
    userContent.push({ text: prompt, type: "text" });
  }
  const ignoredFiles: string[] = [];

  for (const file of normalizedFiles) {
    if (isImageMimeType(file.mimeType)) {
      userContent.push({
        image_url: {
          url: `data:${file.mimeType};base64,${file.base64Data}`,
        },
        type: "image_url",
      });
      continue;
    }

    if (file.mimeType === "application/pdf") {
      try {
        const pdfBuffer = Buffer.from(file.base64Data, "base64");
        const parser = new PDFParse({ data: pdfBuffer });
        const pdfData = await parser.getText();
        const textContent = pdfData.text || "";
        userContent.push({
          text: `\n\n--- FILE ATTACHED: ${file.name} ---\n${textContent}\n--- END OF FILE ---`,
          type: "text",
        });
        continue;
      } catch (err) {
        console.error("[LLM ERROR] Failed to parse PDF:", err);
        // Fallback to ignore
      }
    }

    if (
      file.mimeType.startsWith("text/") ||
      file.mimeType === "application/json"
    ) {
      try {
        const textContent = Buffer.from(file.base64Data, "base64").toString(
          "utf-8"
        );
        userContent.push({
          text: `\n\n--- FILE ATTACHED: ${file.name} ---\n${textContent}\n--- END OF FILE ---`,
          type: "text",
        });
        continue;
      } catch {
        // Fallback to ignore
      }
    }

    ignoredFiles.push(`${file.name} (${file.mimeType})`);
  }

  if (ignoredFiles.length > 0) {
    userContent.push({
      text: `Ignored non-image attachments for this provider: ${ignoredFiles.join(", ")}.`,
      type: "text",
    });
  }

  const messages: Record<string, unknown>[] = [
    {
      content: systemMessage,
      role: "system",
    },
  ];

  if (Array.isArray(options.messages)) {
    const sanitizedMessages = (options.messages as Record<string, unknown>[]).map((msg: Record<string, unknown>) => {
      const cleanMsg: Record<string, unknown> = {
        role: msg.role,
      };

      if (msg.content !== undefined && msg.content !== null) {
        cleanMsg.content = msg.content;
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        cleanMsg.tool_calls = (msg.tool_calls as Record<string, unknown>[]).map((tc: Record<string, unknown>) => ({
          function: {
            arguments: tc.function.arguments,
            name: tc.function.name,
          },
          id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}`,
          type: "function",
          ...(tc.extra_content ? { extra_content: tc.extra_content } : {}),
        }));
      }

      if (msg.role === "tool") {
        cleanMsg.tool_call_id =
          msg.tool_call_id ||
          `call_${Math.random().toString(36).substring(2, 11)}`;

        if (typeof msg.content === "string") {
          cleanMsg.content = msg.content;
        } else if (msg.content === undefined || msg.content === null) {
          cleanMsg.content = "{}";
        } else {
          cleanMsg.content = JSON.stringify(msg.content);
        }
      }

      return cleanMsg;
    });

    messages.push(...sanitizedMessages);
  }

  if (userContent.length > 0) {
    messages.push({
      content: userContent,
      role: "user",
    });
  }

  const payload: Record<string, unknown> = {
    messages,
    model: modelName || config.model,
    temperature: config.temperature,
    top_p: config.topP,
  };

  if (config.baseURL.includes("generativelanguage.googleapis.com")) {
    payload.max_tokens = config.maxTokens;
  } else {
    payload.max_completion_tokens = config.maxTokens;
  }

  if (options.allowEdit && options.functions) {
    payload.tools = (options.functions as Record<string, unknown>[]).map((fn: Record<string, unknown>) => {
      const fnDef = (fn.function || fn) as Record<string, unknown>;
      return {
        function: {
          description: fnDef.description,
          name: fnDef.name,
          parameters: fnDef.parameters,
        },
        type: "function",
      };
    });
    payload.tool_choice = options.forceToolUse ? "required" : "auto";
  }

  if (options.onChunk) {
    payload.stream = true;
    const response = await axios.post(endpointUrl, payload, {
      headers: requestHeaders,
      responseType: "stream",
      timeout: config.timeout,
    });

    let fullContent = "";
    let finalUsage: Record<string, unknown> | null = null;
    let finalToolCalls: Record<string, unknown>[] | null = null;
    let streamBuffer = "";

    for await (const chunk of response.data) {
      streamBuffer += chunk.toString();
      let newlineIndex: number;
      while ((newlineIndex = streamBuffer.indexOf("\n")) >= 0) {
        const line = streamBuffer.slice(0, newlineIndex).trim();
        streamBuffer = streamBuffer.slice(newlineIndex + 1);

        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const parsed = JSON.parse(line.slice(6));
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              options.onChunk(deltaContent);
            }
            const deltaToolCalls = parsed.choices?.[0]?.delta?.tool_calls;
            if (deltaToolCalls) {
              if (!finalToolCalls) finalToolCalls = [];
              for (let i = 0; i < deltaToolCalls.length; i++) {
                const tc = deltaToolCalls[i];
                let tcIndex = tc.index;
                if (tcIndex === undefined) {
                  if (tc.id) {
                    const existingIndex = finalToolCalls.findIndex(
                      (t) => t && t.id === tc.id
                    );
                    tcIndex =
                      existingIndex >= 0
                        ? existingIndex
                        : finalToolCalls.length;
                  } else {
                    tcIndex =
                      finalToolCalls.length > 0 ? finalToolCalls.length - 1 : 0;
                    if (
                      tc.function?.name &&
                      finalToolCalls[tcIndex] &&
                      finalToolCalls[tcIndex].function.name
                    ) {
                      const oldName = finalToolCalls[tcIndex].function.name;
                      const newName = tc.function.name;
                      if (
                        newName !== oldName &&
                        !newName.startsWith(oldName) &&
                        !oldName.startsWith(newName)
                      ) {
                        tcIndex = finalToolCalls.length;
                      }
                    }
                  }
                }

                if (!finalToolCalls[tcIndex]) {
                  finalToolCalls[tcIndex] = {
                    function: { arguments: "", name: "" },
                    id: tc.id,
                    type: "function",
                  };
                }
                // Handle cases where ID comes in later chunks
                if (tc.id && !finalToolCalls[tcIndex].id) {
                  finalToolCalls[tcIndex].id = tc.id;
                }
                if (tc.extra_content) {
                  finalToolCalls[tcIndex].extra_content = tc.extra_content;
                }
                if (tc.function?.name) {
                  if (
                    tc.function.name === finalToolCalls[tcIndex].function.name
                  ) {
                    // Duplicate full name from some providers, ignore
                  } else if (
                    tc.function.name.startsWith(
                      finalToolCalls[tcIndex].function.name
                    )
                  ) {
                    // Cumulative name, overwrite
                    finalToolCalls[tcIndex].function.name = tc.function.name;
                  } else {
                    // Partial chunked name, append
                    finalToolCalls[tcIndex].function.name += tc.function.name;
                  }
                }
                if (tc.function?.arguments) {
                  if (
                    tc.function.arguments ===
                    finalToolCalls[tcIndex].function.arguments
                  ) {
                    // Duplicate full arguments from some providers, ignore
                  } else if (
                    tc.function.arguments.startsWith(
                      finalToolCalls[tcIndex].function.arguments
                    )
                  ) {
                    // Cumulative arguments, overwrite
                    finalToolCalls[tcIndex].function.arguments =
                      tc.function.arguments;
                  } else {
                    // Partial chunked arguments, append
                    finalToolCalls[tcIndex].function.arguments +=
                      tc.function.arguments;
                  }
                }
              }
            }
            if (parsed.usage) {
              finalUsage = parsed.usage;
            }
          } catch { /* ignore */ }
        }
      }
    }

    if (finalToolCalls && finalToolCalls.length > 0) {
      const safeParse = (str: string) => {
        if (!str) return {};
        try {
          return JSON.parse(str);
        } catch {
          // Attempt to fix duplicate strings from bad Gemini deltas e.g. "{}{}"
          try {
            if (str.includes("}{")) {
              const fixed = str.split("}{")[0] + "}";
              return JSON.parse(fixed);
            }
          } catch { /* ignore */ }
          return {};
        }
      };

      const toolCall = finalToolCalls[0];
      return ProviderResponseSchema.parse({
        functionCall: {
          arguments: safeParse(toolCall.function.arguments),
          name: toolCall.function.name,
        },
        text: null,
        toolCallId: toolCall.id,
        toolCalls: finalToolCalls.map((tc) => {
          const mapped: Record<string, unknown> = {
            arguments: safeParse(tc.function.arguments),
            id: tc.id,
            name: tc.function.name,
          };
          if (tc.extra_content) {
            mapped.extra_content = tc.extra_content;
          }
          return mapped;
        }),
        type: "function_call",
        usage: finalUsage
          ? {
              inputTokens: finalUsage.prompt_tokens || 0,
              outputTokens: finalUsage.completion_tokens || 0,
              totalTokens: finalUsage.total_tokens || 0,
            }
          : null,
      });
    }

    return ProviderResponseSchema.parse({
      functionCall: null,
      text: fullContent,
      type: "text",
      usage: finalUsage
        ? {
            inputTokens: finalUsage.prompt_tokens || 0,
            outputTokens: finalUsage.completion_tokens || 0,
            totalTokens: finalUsage.total_tokens || 0,
          }
        : null,
    });
  }

  const response = await axios.post(endpointUrl, payload, {
    headers: requestHeaders,
    timeout: config.timeout,
  });

  const message = response.data.choices[0]?.message;
  const usageData = response.data.usage;
  const usage = usageData
    ? {
        inputTokens: usageData.prompt_tokens || 0,
        outputTokens: usageData.completion_tokens || 0,
        totalTokens: usageData.total_tokens || 0,
      }
    : null;

  if (message?.tool_calls?.length) {
    const toolCall = message.tool_calls[0];

    const safeParse = (str: string) => {
      if (!str) return {};
      try {
        return JSON.parse(str);
      } catch {
        return {};
      }
    };

    return ProviderResponseSchema.parse({
      functionCall: {
        arguments: safeParse(toolCall.function.arguments),
        name: toolCall.function.name,
      },
      text: null,
      toolCallId: toolCall.id,
      toolCalls: message.tool_calls.map((tc: Record<string, unknown>) => {
        const mapped: Record<string, unknown> = {
          arguments: safeParse(tc.function.arguments),
          id: tc.id,
          name: tc.function.name,
        };
        if (tc.extra_content) {
          mapped.extra_content = tc.extra_content;
        }
        return mapped;
      }), // For backwards compatibility
      type: "function_call",
      usage,
    });
  }

  return ProviderResponseSchema.parse({
    functionCall: null,
    text: message?.content || "",
    type: "text",
    usage,
  });
}

async function sleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function callProviderWithRetry(
  provider: AiProvider,
  model: string,
  prompt: string,
  systemMessage: string,
  options: Record<string, unknown> = {},
  retryCount = 0
): Promise<ProviderResponse> {
  const config = getProviderConfig(provider);

  try {
    if (provider === AI_PROVIDERS.GEMINI || provider === AI_PROVIDERS.OPENAI) {
      return await callGenericApi(
        prompt,
        systemMessage,
        config,
        options,
        model
      );
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    if (err.response && (err.response as Record<string, unknown>).data) {
      const responseData = (err.response as Record<string, unknown>).data as Record<string, unknown>;
      if (typeof responseData.on === "function") {
        let errorBody = "";
        responseData.on("data", (chunk: unknown) => {
          errorBody += (chunk as { toString(): string }).toString();
        });
        responseData.on("end", () => {
          console.error(
            "[LLM ERROR] Provider API returned (stream):",
            errorBody
          );
        });
      } else {
        console.error(
          "[LLM ERROR] Provider API returned:",
          JSON.stringify(err.response.data, null, 2)
        );
      }
    }
    if (retryCount >= config.retry.maxRetries) {
      throw error;
    }

    const delayMs =
      config.retry.initialDelay *
      Math.pow(config.retry.backoffFactor, retryCount);
    await sleep(delayMs);
    return callProviderWithRetry(
      provider,
      model,
      prompt,
      systemMessage,
      options,
      retryCount + 1
    );
  }
}

function resolveModelName(modelName: string): string {
  const normalizedModelName = normalizeModelName(modelName);
  if (!normalizedModelName || normalizedModelName === "auto") {
    return resolveDefaultModelName();
  }
  if (normalizedModelName === "openai") {
    return "gpt-5.4";
  }
  if (normalizedModelName === "gemini") {
    return "gemini-3.5-flash";
  }

  return normalizedModelName;
}

export interface CallAIProviderParams {
  options?: Record<string, unknown>;
  prompt: string;
  model: string;
  systemMessage: string;
}

export interface CallAIProviderResult {
  data: ProviderResponse;
  model: string;
  provider: AiProvider;
}

/**
 * High-level unified interface to call an AI provider. Normalizes provider differences,
 * handles retries, and formats the response output.
 *
 * @param {object} params - Execution parameters.
 * @param {object} [params.options={}] - Optional settings (files, tool schemas, streaming callbacks).
 * @param {string} params.prompt - The user's input prompt.
 * @param {string} params.model - The requested model name.
 * @param {string} params.systemMessage - The system instructions.
 * @returns {Promise<{data: object, model: string, provider: string}>} The execution result.
 * @throws {Error} If the provider call fails after max retries.
 */
export async function callAIProvider({
  options = {},
  prompt,
  model,
  systemMessage,
}: CallAIProviderParams): Promise<CallAIProviderResult> {
  try {
    const resolvedModel = resolveModelName(model);
    const primaryProvider = resolveProviderByModel(resolvedModel);
    const data = await callProviderWithRetry(
      primaryProvider,
      resolvedModel,
      prompt,
      systemMessage,
      options
    );
    return { data, model: resolvedModel, provider: primaryProvider };
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    if (!err.code) {
      err.code = "ENGINE_PROVIDER_CALL_FAILED";
    }
    throw err;
  }
}

function resolveProviderByModel(modelName: string): AiProvider {
  return getProviderByModelName(modelName);
}
