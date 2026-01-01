/**
 * ESTRUTURA PADRÃO DE UM PLANO
 * 
 * Esta é a referência completa da estrutura JSON esperada na coluna 'details' da tabela 'plans'
 */
const PLAN_STRUCTURE = {
  // Limites quantitativos do plano
  limits: {
    // Limites de exportação
    exports: {
      notes_monthly: 0,      // Número de exportações de notas por mês
      backups_monthly: 0,    // Número de backups completos por mês
    },
    // Limites de armazenamento
    storage: {
      retention_days: null,           // Dias de retenção de arquivos (null = ilimitado)
      max_file_size_mb: 0,           // Tamanho máximo de arquivo individual em MB
      total_monthly_upload_mb: 0,    // Total de upload mensal permitido em MB
    },
    // Limites de recursos principais
    max_notes: 0,                    // Número máximo de notas
    max_projects: 0,                 // Número máximo de projetos
    max_team_members: 0,             // Número máximo de membros da equipe
  },
  
  // Funcionalidades disponíveis
  features: {
    dark_mode: false,                // Tema escuro
    custom_branding: false,          // Personalização de marca
    priority_support: false,         // Suporte prioritário
    collaboration_tools: false,      // Ferramentas de colaboração
  },
  
  // Metadados do plano
  metadata: {
    version: "1.0",                  // Versão da estrutura do plano
    plan_tier: "free",               // Tier do plano (free, starter, pro, enterprise)
    is_trial_available: false,       // Se oferece período trial
  },
  
  // Configurações de IA (Weave AI)
  weave_ai: {
    enabled: false,                  // Se a IA está habilitada
    config: {
      default_model: "",             // Modelo padrão (ex: gpt-4o-mini, gpt-4o)
      available_models: [],          // Modelos disponíveis para o plano
      monthly_messages: 0,           // Limite de mensagens de IA por mês
      max_tokens_per_message: 0,     // Tokens máximos por mensagem
      context_window_messages: 0,    // Janela de contexto em mensagens
    },
    features: [],                    // Features de IA (summarization, creation, edit, chat, code_review)
  },
};

/**
 * PATHS JSONB PARA VALIDAÇÃO E CONSUMO
 * Facilita referência aos caminhos no JSONB
 */
const PLAN_PATHS = {
  // Limites
  LIMITS: {
    EXPORTS: {
      NOTES_MONTHLY: "limits.exports.notes_monthly",
      BACKUPS_MONTHLY: "limits.exports.backups_monthly",
    },
    STORAGE: {
      RETENTION_DAYS: "limits.storage.retention_days",
      MAX_FILE_SIZE: "limits.storage.max_file_size_mb",
      TOTAL_MONTHLY_UPLOAD: "limits.storage.total_monthly_upload_mb",
    },
    MAX_NOTES: "limits.max_notes",
    MAX_PROJECTS: "limits.max_projects",
    MAX_TEAM_MEMBERS: "limits.max_team_members",
  },
  
  // Features
  FEATURES: {
    DARK_MODE: "features.dark_mode",
    CUSTOM_BRANDING: "features.custom_branding",
    PRIORITY_SUPPORT: "features.priority_support",
    COLLABORATION_TOOLS: "features.collaboration_tools",
  },
  
  // Weave AI
  WEAVE_AI: {
    ENABLED: "weave_ai.enabled",
    CONFIG: {
      DEFAULT_MODEL: "weave_ai.config.default_model",
      AVAILABLE_MODELS: "weave_ai.config.available_models",
      MONTHLY_MESSAGES: "weave_ai.config.monthly_messages",
      MAX_TOKENS: "weave_ai.config.max_tokens_per_message",
      CONTEXT_WINDOW: "weave_ai.config.context_window_messages",
    },
    FEATURES: "weave_ai.features",
  },
};

/**
 * PATHS DE USO (plans_usage.usage_details)
 * Facilita referência aos caminhos do JSONB de uso
 */
const USAGE_PATHS = {
  // Sumário de uso acumulado
  SUMMARY: {
    NOTES_TOTAL: "usage_summary.notes_total",
    PROJECTS_TOTAL: "usage_summary.projects_total",
    TEAM_MEMBERS_TOTAL: "usage_summary.team_members_total",
  },
  
  // Ciclo mensal (reseta todo mês)
  MONTHLY: {
    EXPORTS: {
      NOTES_COUNT: "monthly_cycle.exports.notes_count",
      BACKUPS_COUNT: "monthly_cycle.exports.backups_count",
    },
    STORAGE: {
      FILES_COUNT: "monthly_cycle.storage.files_count",
      TOTAL_UPLOADED_MB: "monthly_cycle.storage.total_uploaded_mb",
    },
    WEAVE_AI: {
      MESSAGES_SENT: "monthly_cycle.weave_ai.messages_sent",
      TOKENS_ESTIMATED: "monthly_cycle.weave_ai.tokens_estimated",
    },
    PERIOD_START: "monthly_cycle.current_period_start",
    PERIOD_END: "monthly_cycle.current_period_end",
  },
  
  // Metadados de histórico
  HISTORY: {
    LAST_ACTIVITY: "history_metadata.last_activity_at",
    USAGE_PERCENTAGE: "history_metadata.usage_percentage_total",
  },
};

module.exports = {
  PLAN_STRUCTURE,
  PLAN_PATHS,
  USAGE_PATHS,
};