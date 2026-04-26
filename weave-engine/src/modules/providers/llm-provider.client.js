const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  AI_PROVIDERS,
  getProviderByModelName,
  getProviderConfig,
  normalizeModelName,
  resolveDefaultModelName,
} = require("../../services/llm.client");

let geminiClient = null;

function createProviderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
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

async function callGeminiApi(prompt, systemMessage, config, options = {}, modelName) {
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
  const fullPrompt = `${systemMessage}\n\n---\n\n${prompt}`;
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;

  if (response.promptFeedback && response.promptFeedback.blockReason) {
    throw new Error(
      `Gemini blocked content: ${response.promptFeedback.blockReason}`
    );
  }

  const functionCall = response.functionCalls()?.[0];
  if (functionCall) {
    return {
      functionCall: {
        arguments: functionCall.args,
        name: functionCall.name,
      },
      text: null,
      type: "function_call",
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
  };
}

async function callOpenAiApi(prompt, systemMessage, config, options = {}, modelName) {
  if (!config.apiKey) {
    throw createProviderError(
      "ENGINE_OPENAI_API_KEY_MISSING",
      "OPENAI_API_KEY is required to call OpenAI provider"
    );
  }

  const payload = {
    max_tokens: config.maxTokens,
    messages: [
      {
        content: systemMessage,
        role: "system",
      },
      {
        content: prompt,
        role: "user",
      },
    ],
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

  const response = await axios.post(`${config.baseURL}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: config.timeout,
  });

  const message = response.data.choices[0]?.message;
  if (message?.tool_calls?.length) {
    const toolCall = message.tool_calls[0];
    return {
      functionCall: {
        arguments: JSON.parse(toolCall.function.arguments || "{}"),
        name: toolCall.function.name,
      },
      text: null,
      type: "function_call",
    };
  }

  return {
    functionCall: null,
    text: message?.content || "",
    type: "text",
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
      config.retry.initialDelay * Math.pow(config.retry.backoffFactor, retryCount);
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
    return "gpt-4o-mini";
  }
  if (normalizedModelName === "gemini") {
    return "gemini-2.0-flash";
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
