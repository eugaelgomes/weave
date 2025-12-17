/**
 * AI Service
 * Serviço centralizado para comunicação com providers de IA
 */

const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  getProviderConfig,
  AI_PROVIDERS,
} = require("@/services/weave-ai/config/config");

// Inicializa cliente Gemini
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Chamada para API do Gemini usando a biblioteca oficial
 */
async function callGeminiAPI(prompt, systemMessage, config, options = {}) {
  if (!genAI) {
    throw new Error(
      "Gemini API não está configurada. Verifique GEMINI_API_KEY"
    );
  }

  const modelConfig = {
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
    },
    safetySettings: config.safetySettings,
  };

  // Se allowEdit=true, adiciona function declarations ao modelo
  if (options.allowEdit && options.functions) {
    modelConfig.tools = [
      {
        functionDeclarations: options.functions,
      },
    ];

    // Se forceToolUse=true, configura tool_config para forçar uso
    if (options.forceToolUse) {
      modelConfig.toolConfig = {
        functionCallingConfig: {
          mode: "ANY", // Força a chamar alguma função
        },
      };
    }
  }

  const model = genAI.getGenerativeModel(modelConfig);

  // Combina system message com o prompt
  const fullPrompt = `${systemMessage}\n\n---\n\n${prompt}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;

  // Verifica bloqueios de segurança
  if (response.promptFeedback && response.promptFeedback.blockReason) {
    throw new Error(
      `Conteúdo bloqueado pelo Gemini: ${response.promptFeedback.blockReason}`
    );
  }

  // Verifica se há function calls
  const functionCall = response.functionCalls()?.[0];
  if (functionCall) {
    return {
      type: "function_call",
      functionCall: {
        name: functionCall.name,
        arguments: functionCall.args,
      },
      text: null,
    };
  }

  // Tenta obter texto, tratando possíveis erros se a resposta estiver vazia
  let text = "";
  try {
    text = response.text();
  } catch (e) {
    console.warn(
      "Gemini não retornou texto válido (pode ser apenas function call ou vazio)."
    );
  }

  return {
    type: "text",
    text: text,
    functionCall: null,
  };
}

/**
 * Chamada para API do Perplexity
 */
async function callPerplexityAPI(prompt, systemMessage, config, options = {}) {
  const url = `${config.baseURL}/chat/completions`;

  const payload = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    return_citations: config.returnCitations,
    return_images: config.returnImages,
    search_recency_filter: config.searchRecencyFilter,
    search_domain_filter: config.searchDomainFilter,
  };

  // Se allowEdit=true, adiciona tools para function calling (formato OpenAI)
  if (options.allowEdit && options.functions) {
    payload.tools = options.functions.map((fn) => ({
      type: "function",
      function: fn,
    }));

    // Se forceToolUse=true, força a IA a usar uma função
    if (options.forceToolUse) {
      payload.tool_choice = "required"; // Força uso de função
    } else {
      payload.tool_choice = "auto"; // Deixa a IA decidir
    }
  }

  const response = await axios.post(url, payload, {
    timeout: config.timeout,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  const message = response.data.choices[0]?.message;

  // Verifica se há tool_calls (function calling)
  if (message?.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    return {
      type: "function_call",
      functionCall: {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      },
      text: null,
      citations: response.data.citations || [],
    };
  }

  // Resposta normal de texto
  return {
    type: "text",
    text: message?.content || "",
    functionCall: null,
    citations: response.data.citations || [],
  };
}

/**
 * Executa chamada para provider de IA com retry
 */
async function callAIProvider(
  provider,
  prompt,
  systemMessage,
  options = {},
  retryCount = 0
) {
  const config = getProviderConfig(provider);

  try {
    if (provider === AI_PROVIDERS.GEMINI) {
      return await callGeminiAPI(prompt, systemMessage, config, options);
    } else if (provider === AI_PROVIDERS.PERPLEXITY) {
      return await callPerplexityAPI(prompt, systemMessage, config, options);
    }
  } catch (error) {
    // Retry logic
    if (retryCount < config.retry.maxRetries) {
      const delay =
        config.retry.initialDelay *
        Math.pow(config.retry.backoffFactor, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callAIProvider(
        provider,
        prompt,
        systemMessage,
        options,
        retryCount + 1
      );
    }

    throw error;
  }
}

module.exports = {
  callAIProvider,
};
