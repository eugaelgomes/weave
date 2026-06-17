/**
 * @module weave-engine/modules/core/providers/llm-provider.client
 * @description Centralized HTTP client for interacting with external AI providers (OpenAI, Gemini).
 * Handles prompt formatting, message normalization, tool schema translation, and streaming execution.
 *
 * Dependencies:
 * - `axios`: For HTTP requests.
 * - `../../../services/llm.client`: For credential management and provider routing.
 */
const axios = require("axios");
const {
  AI_PROVIDERS,
  getProviderByModelName,
  getProviderConfig,
  normalizeModelName,
  resolveDefaultModelName,
} = require("../../../services/llm.client");

const MAX_INLINE_FILES_PER_REQUEST = Number.parseInt(
  process.env.WEAVE_MAX_INLINE_FILES_PER_REQUEST || "3",
  10
);

/**
 * @param {unknown} maybeBase64
 * @returns {string}
 */
function normalizeBase64Data(maybeBase64) {
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

/**
 * @param {unknown} rawFile
 * @returns {{name: string, mimeType: string, base64Data: string}|null}
 */
function normalizeFileInput(rawFile) {
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
 * @param {unknown} files
 * @returns {Array<{name: string, mimeType: string, base64Data: string}>}
 */
function normalizeFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return files
    .slice(0, MAX_INLINE_FILES_PER_REQUEST)
    .map((file) => normalizeFileInput(file))
    .filter(Boolean);
}

/**
 * @param {string} mimeType
 * @returns {boolean}
 */
function isImageMimeType(mimeType) {
  return (
    typeof mimeType === "string" && mimeType.toLowerCase().startsWith("image/")
  );
}

function createProviderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} code
 * @returns {Promise<T>}
 */
async function withTimeout(promise, timeoutMs, code) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        createProviderError(code, `Provider timeout after ${timeoutMs}ms`)
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGenericApi(
  prompt,
  systemMessage,
  config,
  options = {},
  modelName
) {
  if (!config.apiKey) {
    throw createProviderError(
      "ENGINE_OPENAI_API_KEY_MISSING",
      "OPENAI_API_KEY is required to call OpenAI provider"
    );
  }

  const isAzure = config.baseURL.includes("azure.com");
  const endpointUrl = isAzure
    ? `${config.baseURL}/chat/completions?api-version=2024-05-01-preview`
    : `${config.baseURL}/chat/completions`;

  const requestHeaders = {
    "Content-Type": "application/json",
  };

  if (isAzure) {
    requestHeaders["api-key"] = config.apiKey;
  } else {
    requestHeaders["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const normalizedFiles = normalizeFiles(options.files);
  const userContent = [];
  if (prompt) {
    userContent.push({ text: prompt, type: "text" });
  }
  const ignoredFiles = [];

  normalizedFiles.forEach((file) => {
    if (isImageMimeType(file.mimeType)) {
      userContent.push({
        image_url: {
          url: `data:${file.mimeType};base64,${file.base64Data}`,
        },
        type: "image_url",
      });
      return;
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
        return;
      } catch (err) {
        // Fallback to ignore
      }
    }

    ignoredFiles.push(`${file.name} (${file.mimeType})`);
  });

  if (ignoredFiles.length > 0) {
    userContent.push({
      text: `Ignored non-image attachments for this provider: ${ignoredFiles.join(", ")}.`,
      type: "text",
    });
  }

  const messages = [
    {
      content: systemMessage,
      role: "system",
    },
  ];

  if (Array.isArray(options.messages)) {
    const sanitizedMessages = options.messages.map((msg) => {
      const cleanMsg = {
        role: msg.role,
      };

      if (msg.content !== undefined && msg.content !== null) {
        cleanMsg.content = msg.content;
      }

      if (msg.role === "assistant" && msg.tool_calls) {
        cleanMsg.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id || `call_${Math.random().toString(36).substring(2, 11)}`,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
          ...(tc.extra_content ? { extra_content: tc.extra_content } : {})
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

  const payload = {
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
    payload.tools = options.functions.map((fn) => ({
      function: {
        description: fn.description,
        name: fn.name,
        parameters: fn.parameters,
      },
      type: "function",
    }));
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
    let finalUsage = null;
    let finalToolCalls = null;
    let streamBuffer = "";

    for await (const chunk of response.data) {
      streamBuffer += chunk.toString();
      let newlineIndex;
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
                const tcIndex = tc.index !== undefined ? tc.index : i;
                if (!finalToolCalls[tcIndex]) {
                  finalToolCalls[tcIndex] = {
                    id: tc.id,
                    type: "function",
                    function: { name: "", arguments: "" },
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
                  finalToolCalls[tcIndex].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  finalToolCalls[tcIndex].function.arguments += tc.function.arguments;
                }
              }
            }
            if (parsed.usage) {
              finalUsage = parsed.usage;
            }
          } catch {}
        }
      }
    }

    if (finalToolCalls && finalToolCalls.length > 0) {
      const safeParse = (str) => {
        if (!str) return {};
        try {
          return JSON.parse(str);
        } catch (e) {
          // Attempt to fix duplicate strings from bad Gemini deltas e.g. "{}{}"
          try {
            if (str.includes("}{")) {
              const fixed = str.split("}{")[0] + "}";
              return JSON.parse(fixed);
            }
          } catch(err2) {}
          return {};
        }
      };

      const toolCall = finalToolCalls[0];
      return {
        functionCall: {
          arguments: safeParse(toolCall.function.arguments),
          name: toolCall.function.name,
        },
        toolCalls: finalToolCalls.map((tc) => {
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: safeParse(tc.function.arguments),
            extra_content: tc.extra_content,
          };
        }),
        text: null,
        toolCallId: toolCall.id,
        type: "function_call",
        usage: finalUsage
          ? {
              inputTokens: finalUsage.prompt_tokens || 0,
              outputTokens: finalUsage.completion_tokens || 0,
              totalTokens: finalUsage.total_tokens || 0,
            }
          : null,
      };
    }

    return {
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
    };
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

    const safeParse = (str) => {
      if (!str) return {};
      try {
        return JSON.parse(str);
      } catch (e) {
        return {};
      }
    };

    return {
      functionCall: {
        arguments: safeParse(toolCall.function.arguments),
        name: toolCall.function.name,
      },
      toolCalls: message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeParse(tc.function.arguments),
      })),
      text: null,
      toolCallId: toolCall.id, // For backwards compatibility
      type: "function_call",
      usage,
    };
  }

  return {
    functionCall: null,
    text: message?.content || "",
    type: "text",
    usage,
  };
}

async function sleep(delayMs) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function callProviderWithRetry(
  provider,
  model,
  prompt,
  systemMessage,
  options = {},
  retryCount = 0
) {
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
  } catch (error) {
    if (error.response && error.response.data) {
      if (typeof error.response.data.on === "function") {
        let errorBody = "";
        error.response.data.on("data", (chunk) => {
          errorBody += chunk.toString();
        });
        error.response.data.on("end", () => {
          console.error(
            "[LLM ERROR] Provider API returned (stream):",
            errorBody
          );
        });
      } else {
        console.error(
          "[LLM ERROR] Provider API returned:",
          JSON.stringify(error.response.data, null, 2)
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

function resolveModelName(modelName) {
  const normalizedModelName = normalizeModelName(modelName);
  if (!normalizedModelName || normalizedModelName === "auto") {
    return resolveDefaultModelName();
  }
  if (normalizedModelName === "openai") {
    return "gpt-5.4-mini";
  }
  if (normalizedModelName === "gemini") {
    return "gemini-3.5-flash";
  }

  return normalizedModelName;
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
async function callAIProvider({ options = {}, prompt, model, systemMessage }) {
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
  } catch (error) {
    if (!error.code) {
      error.code = "ENGINE_PROVIDER_CALL_FAILED";
    }
    throw error;
  }
}

function resolveProviderByModel(modelName) {
  return getProviderByModelName(modelName);
}

module.exports = {
  callAIProvider,
};
