/**
 * AI Service Configuration
 * Configurações para integração com APIs de IA (Gemini Flash 2.5 e Perplexity)
 */

const AI_PROVIDERS = {
  GEMINI: "gemini",
  PERPLEXITY: "perplexity",
};

const AI_MODELS = {
  GEMINI_FLASH_2_5: "gemini-2.0-flash",
  PERPLEXITY_SONAR: "sonar",
  PERPLEXITY_SONAR_PRO: "sonar-pro",
};

/**
 * Configuração do Gemini Flash 2.5
 */
const geminiConfig = {
  provider: AI_PROVIDERS.GEMINI,
  model: AI_MODELS.GEMINI_FLASH_2_5,
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta",

  // Parâmetros de geração
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,

  // Safety settings
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

  // Rate limits
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },

  // Timeout em ms
  timeout: 30000,

  // Retry configuration
  retry: {
    maxRetries: 3,
    backoffFactor: 2,
    initialDelay: 1000,
  },
};

/**
 * Configuração do Perplexity
 */
const perplexityConfig = {
  provider: AI_PROVIDERS.PERPLEXITY,
  model: AI_MODELS.PERPLEXITY_SONAR_PRO,
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",

  // Parâmetros de geração
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,

  // Perplexity-specific features
  searchDomainFilter: [], // Filtros de domínio para pesquisa
  returnCitations: true, // Retornar citações das fontes
  returnImages: false, // Retornar imagens relacionadas
  searchRecencyFilter: "month", // 'day', 'week', 'month', 'year'

  // Rate limits
  rateLimit: {
    requestsPerMinute: 50,
    tokensPerMinute: 80000,
  },

  // Timeout em ms
  timeout: 30000,

  // Retry configuration
  retry: {
    maxRetries: 3,
    backoffFactor: 2,
    initialDelay: 1000,
  },
};

/**
 * Casos de uso específicos por provider
 */
const useCases = {
  // Gemini - Melhor para criação de conteúdo e análise estruturada
  [AI_PROVIDERS.GEMINI]: [
    "note_generation", // Gerar conteúdo para notas
    "note_summarization", // Resumir notas longas
    "task_breakdown", // Quebrar tarefas em subtarefas
    "content_enhancement", // Melhorar escrita de notas
    "template_generation", // Criar templates de projetos
    "tag_suggestion", // Sugerir tags para organização
    "priority_analysis", // Analisar e sugerir prioridades
  ],

  // Perplexity - Melhor para pesquisa e contexto atualizado
  [AI_PROVIDERS.PERPLEXITY]: [
    "research_assistant", // Pesquisar informações para projetos
    "link_summarization", // Resumir links/artigos
    "trend_analysis", // Analisar tendências de mercado
    "competitive_research", // Pesquisa competitiva
    "fact_checking", // Verificar informações
    "source_gathering", // Coletar fontes confiáveis
  ],
};

/**
 * Configuração de fallback
 */
const fallbackConfig = {
  // Se Gemini falhar, tentar Perplexity para casos compatíveis
  enableFallback: true,
  fallbackPriority: [AI_PROVIDERS.GEMINI, AI_PROVIDERS.PERPLEXITY],

  // Mapear casos de uso entre providers quando possível
  useCaseMapping: {
    note_generation: {
      primary: AI_PROVIDERS.GEMINI,
      fallback: AI_PROVIDERS.PERPLEXITY,
    },
    research_assistant: {
      primary: AI_PROVIDERS.PERPLEXITY,
      fallback: AI_PROVIDERS.GEMINI,
    },
  },
};

/**
 * Configuração de cache para respostas
 */
const cacheConfig = {
  enabled: true,
  ttl: 3600, // 1 hora em segundos
  maxSize: 100, // Máximo de respostas em cache
  cacheKey: (provider, prompt, context) => {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(`${provider}-${prompt}-${JSON.stringify(context)}`);
    return hash.digest("hex");
  },
};

/**
 * Obter configuração baseada no provider
 */
function getProviderConfig(provider) {
  switch (provider) {
    case AI_PROVIDERS.GEMINI:
      return geminiConfig;
    case AI_PROVIDERS.PERPLEXITY:
      return perplexityConfig;
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

/**
 * Obter provider ideal para um caso de uso
 */
function getProviderForUseCase(useCase) {
  for (const [provider, cases] of Object.entries(useCases)) {
    if (cases.includes(useCase)) {
      return provider;
    }
  }
  return AI_PROVIDERS.GEMINI; // Default
}

/**
 * Validar configuração
 */
function validateConfig() {
  const errors = [];

  if (!process.env.GEMINI_API_KEY) {
    errors.push("GEMINI_API_KEY não configurada");
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    errors.push("PERPLEXITY_API_KEY não configurada");
  }

  if (errors.length > 0) {
    console.warn("⚠️  Avisos de configuração AI:", errors.join(", "));
  }

  return errors.length === 0;
}

module.exports = {
  AI_PROVIDERS,
  AI_MODELS,
  geminiConfig,
  perplexityConfig,
  useCases,
  fallbackConfig,
  cacheConfig,
  getProviderConfig,
  getProviderForUseCase,
  validateConfig,
};
