const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  AI_PROVIDERS,
  fallbackConfig,
  getProviderConfig,
  getProviderForUseCase,
} = require("../../config/llm.config");

let geminiClient = null;

function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to call Gemini provider");
  }

  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return geminiClient;
}

async function callGeminiApi(prompt, systemMessage, config, options = {}) {
  const modelConfig = {
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      topK: config.topK,
      topP: config.topP,
    },
    model: config.model,
    safetySettings: config.safetySettings,
  };

  if (options.allowEdit && options.functions) {
    modelConfig.tools = [
      {
        functionDeclarations: options.functions,
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

async function callPerplexityApi(prompt, systemMessage, config, options = {}) {
  if (!config.apiKey) {
    throw new Error("PERPLEXITY_API_KEY is required to call Perplexity provider");
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
    model: config.model,
    return_citations: config.returnCitations,
    return_images: config.returnImages,
    search_domain_filter: config.searchDomainFilter,
    search_recency_filter: config.searchRecencyFilter,
    temperature: config.temperature,
    top_p: config.topP,
  };

  if (options.allowEdit && options.functions) {
    payload.tools = options.functions.map((fn) => ({
      function: fn,
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
      citations: response.data.citations || [],
      functionCall: {
        arguments: JSON.parse(toolCall.function.arguments),
        name: toolCall.function.name,
      },
      text: null,
      type: "function_call",
    };
  }

  return {
    citations: response.data.citations || [],
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
  prompt,
  systemMessage,
  options = {},
  retryCount = 0
) {
  const config = getProviderConfig(provider);

  try {
    if (provider === AI_PROVIDERS.GEMINI) {
      return await callGeminiApi(prompt, systemMessage, config, options);
    }

    if (provider === AI_PROVIDERS.PERPLEXITY) {
      return await callPerplexityApi(prompt, systemMessage, config, options);
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
      prompt,
      systemMessage,
      options,
      retryCount + 1
    );
  }
}

function resolvePrimaryProvider(provider, useCase) {
  if (provider && provider !== "auto") {
    return provider;
  }

  return getProviderForUseCase(useCase || "chat");
}

async function callAIProvider({ options = {}, prompt, provider, systemMessage, useCase }) {
  const primaryProvider = resolvePrimaryProvider(provider, useCase);

  try {
    const data = await callProviderWithRetry(
      primaryProvider,
      prompt,
      systemMessage,
      options
    );
    return { data, provider: primaryProvider };
  } catch (primaryError) {
    if (!fallbackConfig.enableFallback) {
      throw primaryError;
    }

    const fallbackProvider = fallbackConfig.fallbackPriority.find(
      (item) => item !== primaryProvider
    );

    if (!fallbackProvider) {
      throw primaryError;
    }

    const data = await callProviderWithRetry(
      fallbackProvider,
      prompt,
      systemMessage,
      options
    );

    return { data, provider: fallbackProvider };
  }
}

module.exports = {
  callAIProvider,
};
