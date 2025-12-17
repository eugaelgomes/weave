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
 * Todos os casos de uso disponíveis (unificados)
 * Ambos os providers agora suportam todos os casos de uso
 */
const allUseCases = [
  // Chat e interação
  "chat", // Chat conversacional geral

  // Gestão de notas
  "note_generation", // Gerar conteúdo para notas
  "note_summarization", // Resumir notas longas
  "content_enhancement", // Melhorar escrita de notas
  "tag_suggestion", // Sugerir tags para organização

  // Gestão de projetos
  "project_creation", // Criar novos projetos
  "project_editing", // Editar projetos existentes
  "task_breakdown", // Quebrar tarefas em subtarefas
  "priority_analysis", // Analisar e sugerir prioridades
  "template_generation", // Criar templates de projetos

  // Gestão de blocos de conteúdo
  "block_creation", // Criar blocos de conteúdo estruturado
  "block_editing", // Editar blocos existentes

  // Pesquisa e análise
  "research_assistant", // Pesquisar informações para projetos
  "link_summarization", // Resumir links/artigos
  "trend_analysis", // Analisar tendências de mercado
  "competitive_research", // Pesquisa competitiva
  "fact_checking", // Verificar informações
  "source_gathering", // Coletar fontes confiáveis
];

/**
 * Casos de uso por provider (agora todos compartilham os mesmos)
 */
const useCases = {
  [AI_PROVIDERS.GEMINI]: allUseCases,
  [AI_PROVIDERS.PERPLEXITY]: allUseCases,
};

/**
 * Provider preferencial por caso de uso (para otimização)
 * Mesmo que ambos suportem, alguns providers são melhores para casos específicos
 */
const preferredProviders = {
  // Gemini é melhor para criação e estruturação de conteúdo
  note_generation: AI_PROVIDERS.GEMINI,
  note_summarization: AI_PROVIDERS.GEMINI,
  content_enhancement: AI_PROVIDERS.GEMINI,
  tag_suggestion: AI_PROVIDERS.GEMINI,
  chat: AI_PROVIDERS.GEMINI,

  // Projetos
  project_creation: AI_PROVIDERS.GEMINI,
  project_editing: AI_PROVIDERS.GEMINI,
  task_breakdown: AI_PROVIDERS.GEMINI,
  priority_analysis: AI_PROVIDERS.GEMINI,
  template_generation: AI_PROVIDERS.GEMINI,

  // Blocos de conteúdo
  block_creation: AI_PROVIDERS.GEMINI,
  block_editing: AI_PROVIDERS.GEMINI,

  // Perplexity é melhor para pesquisa e informações atualizadas
  research_assistant: AI_PROVIDERS.PERPLEXITY,
  link_summarization: AI_PROVIDERS.PERPLEXITY,
  trend_analysis: AI_PROVIDERS.PERPLEXITY,
  competitive_research: AI_PROVIDERS.PERPLEXITY,
  fact_checking: AI_PROVIDERS.PERPLEXITY,
  source_gathering: AI_PROVIDERS.PERPLEXITY,
};

/**
 * Configuração de fallback
 */
const fallbackConfig = {
  // Se um provider falhar, tentar o outro automaticamente
  enableFallback: true,

  // Ordem de prioridade: tenta Gemini primeiro, depois Perplexity
  fallbackPriority: [AI_PROVIDERS.GEMINI, AI_PROVIDERS.PERPLEXITY],

  // Com casos de uso unificados, qualquer provider pode ser fallback do outro
  useCaseMapping: "unified", // Todos os casos são compatíveis entre providers
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
  // Retorna o provider preferencial para este caso de uso
  if (preferredProviders[useCase]) {
    return preferredProviders[useCase];
  }

  // Default para Gemini se não houver preferência definida
  return AI_PROVIDERS.GEMINI;
}

/**
 * Validar configuração das APIs
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
  allUseCases,
  useCases,
  preferredProviders,
  fallbackConfig,
  cacheConfig,
  getProviderConfig,
  getProviderForUseCase,
  validateConfig,
};
