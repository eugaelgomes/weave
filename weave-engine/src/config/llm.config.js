const crypto = require("crypto");

const AI_PROVIDERS = {
  GEMINI: "gemini",
  PERPLEXITY: "perplexity",
};

const AI_MODELS = {
  GEMINI_FLASH_2_5: "gemini-2.0-flash",
  PERPLEXITY_SONAR_PRO: "sonar-pro",
};

const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY,
  maxOutputTokens: 8192,
  model: AI_MODELS.GEMINI_FLASH_2_5,
  provider: AI_PROVIDERS.GEMINI,
  retry: {
    backoffFactor: 2,
    initialDelay: 1000,
    maxRetries: 3,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  temperature: 0.7,
  timeout: 30000,
  topK: 40,
  topP: 0.95,
};

const perplexityConfig = {
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
  maxTokens: 4096,
  model: AI_MODELS.PERPLEXITY_SONAR_PRO,
  provider: AI_PROVIDERS.PERPLEXITY,
  retry: {
    backoffFactor: 2,
    initialDelay: 1000,
    maxRetries: 3,
  },
  returnCitations: true,
  returnImages: false,
  searchDomainFilter: [],
  searchRecencyFilter: "month",
  temperature: 0.7,
  timeout: 30000,
  topP: 0.9,
};

const allUseCases = [
  "chat",
  "note_generation",
  "note_summarization",
  "content_enhancement",
  "tag_suggestion",
  "project_creation",
  "project_editing",
  "task_breakdown",
  "priority_analysis",
  "template_generation",
  "block_creation",
  "block_editing",
  "research_assistant",
  "link_summarization",
  "trend_analysis",
  "competitive_research",
  "fact_checking",
  "source_gathering",
];

const preferredProviders = {
  block_creation: AI_PROVIDERS.GEMINI,
  block_editing: AI_PROVIDERS.GEMINI,
  chat: AI_PROVIDERS.GEMINI,
  competitive_research: AI_PROVIDERS.PERPLEXITY,
  content_enhancement: AI_PROVIDERS.GEMINI,
  fact_checking: AI_PROVIDERS.PERPLEXITY,
  link_summarization: AI_PROVIDERS.PERPLEXITY,
  note_generation: AI_PROVIDERS.GEMINI,
  note_summarization: AI_PROVIDERS.GEMINI,
  priority_analysis: AI_PROVIDERS.GEMINI,
  project_creation: AI_PROVIDERS.GEMINI,
  project_editing: AI_PROVIDERS.GEMINI,
  research_assistant: AI_PROVIDERS.PERPLEXITY,
  source_gathering: AI_PROVIDERS.PERPLEXITY,
  tag_suggestion: AI_PROVIDERS.GEMINI,
  task_breakdown: AI_PROVIDERS.GEMINI,
  template_generation: AI_PROVIDERS.GEMINI,
  trend_analysis: AI_PROVIDERS.PERPLEXITY,
};

const fallbackConfig = {
  enableFallback: true,
  fallbackPriority: [AI_PROVIDERS.GEMINI, AI_PROVIDERS.PERPLEXITY],
};

const cacheConfig = {
  cacheKey: (provider, prompt, context) => {
    const hash = crypto.createHash("sha256");
    hash.update(`${provider}-${prompt}-${JSON.stringify(context)}`);
    return hash.digest("hex");
  },
  enabled: true,
  maxSize: 100,
  ttl: 3600,
};

/**
 * @param {string} provider
 * @returns {object}
 */
function getProviderConfig(provider) {
  switch (provider) {
    case AI_PROVIDERS.GEMINI:
      return geminiConfig;
    case AI_PROVIDERS.PERPLEXITY:
      return perplexityConfig;
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * @param {string} useCase
 * @returns {string}
 */
function getProviderForUseCase(useCase) {
  if (preferredProviders[useCase]) {
    return preferredProviders[useCase];
  }

  return AI_PROVIDERS.GEMINI;
}

module.exports = {
  AI_MODELS,
  AI_PROVIDERS,
  allUseCases,
  cacheConfig,
  fallbackConfig,
  geminiConfig,
  getProviderConfig,
  getProviderForUseCase,
  perplexityConfig,
  preferredProviders,
};
