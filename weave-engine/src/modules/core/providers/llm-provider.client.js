const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  AI_PROVIDERS,
  getProviderByModelName,
  getProviderConfig,
  normalizeModelName,
  resolveDefaultModelName,
} = require("../../../services/llm.client");

let geminiClient = null;

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

/**
 * Gemini function declarations do not accept some JSON Schema fields
 * like "additionalProperties". This sanitizer removes unsupported keys.
 *
 * @param {unknown} schema
 * @returns {unknown}
 */
function sanitizeGeminiSchema(schema) {
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeGeminiSchema(item));
  }

  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const next = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties") {
      continue;
    }

    if (key === "type" && Array.isArray(value)) {
      const nonNullTypes = value.filter(
        (item) => typeof item === "string" && item !== "null"
      );
      next[key] = nonNullTypes[0] || "string";
      continue;
    }

    next[key] = sanitizeGeminiSchema(value);
  }

  return next;
}

function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw createProviderError(
      "ENGINE_GEMINI_API_KEY_MISSING",
      "GEMINI_API_KEY is required to call Gemini provider"
    );
  }

  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return geminiClient;
}

async function callGeminiApi(
  prompt,
  systemMessage,
  config,
  options = {},
  modelName
) {
  const modelConfig = {
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      topK: config.topK,
      topP: config.topP,
    },
    model: modelName || config.model,
    safetySettings: config.safetySettings,
  };

  if (systemMessage) {
    modelConfig.systemInstruction = systemMessage;
  }

  if (options.allowEdit && options.functions) {
    modelConfig.tools = [
      {
        functionDeclarations: options.functions.map((fn) => ({
          ...fn,
          parameters: sanitizeGeminiSchema(fn.parameters),
        })),
      },
    ];

    if (options.forceToolUse) {
      modelConfig.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
        },
      };
    }
  }

  const model = getGeminiClient().getGenerativeModel(modelConfig);
  const contents = [];

  if (Array.isArray(options.messages)) {
    for (const msg of options.messages) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        if (msg.rawParts) {
          contents.push({ role: "model", parts: msg.rawParts });
        } else if (msg.tool_calls && msg.tool_calls.length > 0) {
          const fn = msg.tool_calls[0].function;
          contents.push({
            role: "model",
            parts: [
              {
                functionCall: { name: fn.name, args: JSON.parse(fn.arguments) },
              },
            ],
          });
        } else {
          contents.push({
            role: "model",
            parts: [{ text: msg.content || "" }],
          });
        }
      } else if (msg.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response:
                  typeof msg.content === "string"
                    ? { result: msg.content }
                    : msg.content,
              },
            },
          ],
        });
      }
    }
  }

  if (prompt || options.files) {
    const normalizedFiles = normalizeFiles(options.files);
    const userParts = [];
    if (prompt) {
      userParts.push({ text: prompt });
    }
    normalizedFiles.forEach((file) => {
      userParts.push({
        inlineData: {
          data: file.base64Data,
          mimeType: file.mimeType,
        },
      });
    });
    if (userParts.length > 0) {
      contents.push({ role: "user", parts: userParts });
    }
  }

  let finalResult;
  let response;
  if (options.onChunk) {
    finalResult = await withTimeout(
      model.generateContentStream({ contents }),
      config.timeout,
      "ENGINE_PROVIDER_TIMEOUT"
    );
    for await (const chunk of finalResult.stream) {
      if (options.onChunk) {
        try {
          const chunkText = chunk.text();
          if (chunkText) options.onChunk(chunkText);
        } catch {}
      }
    }
    response = await finalResult.response;
  } else {
    finalResult = await withTimeout(
      model.generateContent({ contents }),
      config.timeout,
      "ENGINE_PROVIDER_TIMEOUT"
    );
    response = await finalResult.response;
  }

  if (response.promptFeedback && response.promptFeedback.blockReason) {
    throw new Error(
      `Gemini blocked content: ${response.promptFeedback.blockReason}`
    );
  }

  const usage = response.usageMetadata
    ? {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata.totalTokenCount || 0,
      }
    : null;

  const functionCalls = response.functionCalls();
  if (functionCalls && functionCalls.length > 0) {
    return {
      functionCall: {
        arguments: functionCalls[0].args,
        name: functionCalls[0].name,
      },
      toolCalls: functionCalls.map((call) => ({
        name: call.name,
        arguments: call.args,
      })),
      rawParts: response.candidates?.[0]?.content?.parts || null,
      text: null,
      type: "function_call",
      usage,
    };
  }

  let text = "";
  try {
    text = response.text();
  } catch {
    text = "";
  }

  return {
    functionCall: null,
    text,
    type: "text",
    usage,
  };
}

async function callOpenAiApi(
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
        }));
      }

      if (msg.role === "tool") {
        cleanMsg.tool_call_id =
          msg.tool_call_id ||
          `call_${Math.random().toString(36).substring(2, 11)}`;
        cleanMsg.content = msg.content;
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
    max_tokens: config.maxTokens,
    messages,
    model: modelName || config.model,
    temperature: config.temperature,
    top_p: config.topP,
  };

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
    const response = await axios.post(
      endpointUrl,
      payload,
      {
        headers: requestHeaders,
        responseType: "stream",
        timeout: config.timeout,
      }
    );

    let fullContent = "";
    let finalUsage = null;
    let finalToolCalls = null;

    for await (const chunk of response.data) {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
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
              for (const tc of deltaToolCalls) {
                if (tc.index !== undefined) {
                  if (!finalToolCalls[tc.index]) finalToolCalls[tc.index] = { id: tc.id, type: "function", function: { name: "", arguments: "" } };
                  if (tc.function?.name) finalToolCalls[tc.index].function.name += tc.function.name;
                  if (tc.function?.arguments) finalToolCalls[tc.index].function.arguments += tc.function.arguments;
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
      const toolCall = finalToolCalls[0];
      return {
        functionCall: {
          arguments: toolCall.function.arguments || "{}",
          name: toolCall.function.name,
        },
        toolCalls: finalToolCalls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments || "{}",
        })),
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

  const response = await axios.post(
    endpointUrl,
    payload,
    {
      headers: requestHeaders,
      timeout: config.timeout,
    }
  );

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
    return {
      functionCall: {
        arguments: JSON.parse(toolCall.function.arguments || "{}"),
        name: toolCall.function.name,
      },
      toolCalls: message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || "{}"),
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
    if (provider === AI_PROVIDERS.GEMINI) {
      return await callGeminiApi(prompt, systemMessage, config, options, model);
    }

    if (provider === AI_PROVIDERS.OPENAI) {
      return await callOpenAiApi(prompt, systemMessage, config, options, model);
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  } catch (error) {
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
