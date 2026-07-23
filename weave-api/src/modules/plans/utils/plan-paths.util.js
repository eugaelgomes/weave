/**
 * ESTRUTURA PADRÃO DE UM PLANO
 *
 * Esta é a referência completa da estrutura JSON esperada na coluna 'details' da tabela 'plans'
 */
const PLAN_STRUCTURE = {
  // Regras comerciais/billing para este plano
  billing: {
    billing_cycle: "monthly", // monthly | yearly
    price: {
      amount: 0,
      currency: "BRL",
    },
    trial_days: 0,
  },

  // Funcionalidades disponíveis
  features: {
    // Suporte prioritário
    collaboration_tools: false,

    // Tema escuro
    custom_branding: false,

    dark_mode: false,
    // Personalização de marca
    priority_support: false, // Ferramentas de colaboração
  },

  // Governança de capacidades (feature flags por plano)
  governance: {
    feature_flags: {},
  },

  // Limites quantitativos do plano
  limits: {
    // Limites de exportação
    exports: {
      // Número de exportações de notas por mês
      backups_monthly: 0,
      notes_monthly: 0, // Número de backups completos por mês
    },

    // Limites de recursos principais
    max_notes: 0,

    // Número máximo de notas
    max_projects: 0,

    // Número máximo de projetos
    max_team_members: 0,
    // Limites de armazenamento
    storage: {
      // Dias de retenção de arquivos (null = ilimitado)
      max_file_size_mb: 0,
      retention_days: null, // Tamanho máximo de arquivo individual em MB
      total_monthly_upload_mb: 0, // Total de upload mensal permitido em MB
    }, // Número máximo de membros da equipe
  },

  // Metadados do plano
  metadata: {
    // Tier do plano (free, starter, pro, enterprise)
    is_trial_available: false,

    // Versão da estrutura do plano
    plan_tier: "free",
    version: "1.0", // Se oferece período trial
  },

  // Configurações de IA (Weave AI)
  weave_ai: {
    // Se a IA está habilitada
    config: {
      // Modelo padrão (ex: gpt-4o-mini, gpt-4o)
      available_models: [],
      // Tokens máximos por mensagem
      context_window_messages: 0,

      default_model: "",




// Número máximo de arquivos que podem ser anexados por mensagem
max_file_inputs: 0,






// Janela de contexto em mensagens
// Nível máximo de raciocínio permitido (ex: 'none', 'low', 'medium', 'high')
max_reasoning_level: "none",




// Limite de mensagens de IA por mês
max_tokens_per_message: 0,


      // Modelos disponíveis para o plano
monthly_messages: 0,
    },
    enabled: false,
    features: [], // Features de IA (summarization, creation, edit, chat, code_review)
  },
};

/**
 * PATHS JSONB PARA VALIDAÇÃO E CONSUMO
 * Facilita referência aos caminhos no JSONB
 */
const PLAN_PATHS = {
  BILLING: {
    BILLING_CYCLE: "billing.billing_cycle",
    PRICE_AMOUNT: "billing.price.amount",
    PRICE_CURRENCY: "billing.price.currency",
    TRIAL_DAYS: "billing.trial_days",
  },

  // Features
  FEATURES: {
    COLLABORATION_TOOLS: "features.collaboration_tools",
    CUSTOM_BRANDING: "features.custom_branding",
    DARK_MODE: "features.dark_mode",
    PRIORITY_SUPPORT: "features.priority_support",
  },

  GOVERNANCE: {
    FEATURE_FLAGS: "governance.feature_flags",
  },

  // Limites
  LIMITS: {
    EXPORTS: {
      BACKUPS_MONTHLY: "limits.exports.backups_monthly",
      NOTES_MONTHLY: "limits.exports.notes_monthly",
    },
    MAX_NOTES: "limits.max_notes",
    MAX_PROJECTS: "limits.max_projects",
    MAX_TEAM_MEMBERS: "limits.max_team_members",
    STORAGE: {
      MAX_FILE_SIZE: "limits.storage.max_file_size_mb",
      RETENTION_DAYS: "limits.storage.retention_days",
      TOTAL_MONTHLY_UPLOAD: "limits.storage.total_monthly_upload_mb",
    },
  },

  // Weave AI
  WEAVE_AI: {
    CONFIG: {
      AVAILABLE_MODELS: "weave_ai.config.available_models",
      CONTEXT_WINDOW: "weave_ai.config.context_window_messages",
      DEFAULT_MODEL: "weave_ai.config.default_model",
      MAX_FILE_INPUTS: "weave_ai.config.max_file_inputs",
      MAX_REASONING_LEVEL: "weave_ai.config.max_reasoning_level",
      MAX_TOKENS: "weave_ai.config.max_tokens_per_message",
      MONTHLY_MESSAGES: "weave_ai.config.monthly_messages",
    },
    ENABLED: "weave_ai.enabled",
    FEATURES: "weave_ai.features",
  },
};

/**
 * PATHS DE USO (plan_usages.usage_details)
 * Facilita referência aos caminhos do JSONB de uso
 */
const USAGE_PATHS = {
  // Metadados de histórico
  HISTORY: {
    LAST_ACTIVITY: "history_metadata.last_activity_at",
    USAGE_PERCENTAGE: "history_metadata.usage_percentage_total",
  },

  // Ciclo mensal (reseta todo mês)
  MONTHLY: {
    EXPORTS: {
      BACKUPS_COUNT: "monthly_cycle.exports.backups_count",
      NOTES_COUNT: "monthly_cycle.exports.notes_count",
    },
    PERIOD_END: "monthly_cycle.current_period_end",
    PERIOD_START: "monthly_cycle.current_period_start",
    STORAGE: {
      FILES_COUNT: "monthly_cycle.storage.files_count",
      TOTAL_UPLOADED_MB: "monthly_cycle.storage.total_uploaded_mb",
    },
    WEAVE_AI: {
      FILES_ANALYZED: "monthly_cycle.weave_ai.files_analyzed",
      MESSAGES_SENT: "monthly_cycle.weave_ai.messages_sent",
      REASONING_HIGH_SENT: "monthly_cycle.weave_ai.reasoning_high_sent",
      REASONING_LOW_SENT: "monthly_cycle.weave_ai.reasoning_low_sent",
      REASONING_MEDIUM_SENT: "monthly_cycle.weave_ai.reasoning_medium_sent",
      TOKENS_ESTIMATED: "monthly_cycle.weave_ai.tokens_estimated",
    },
  },

  // Sumário de uso acumulado
  SUMMARY: {
    NOTES_TOTAL: "usage_summary.notes_total",
    PROJECTS_TOTAL: "usage_summary.projects_total",
    TEAM_MEMBERS_TOTAL: "usage_summary.team_members_total",
  },
};

module.exports = {
  PLAN_PATHS,
  PLAN_STRUCTURE,
  USAGE_PATHS,
};
