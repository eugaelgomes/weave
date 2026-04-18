/**
 * ESTRUTURA PADRÃO DE UM PLANO
 *
 * Esta é a referência completa da estrutura JSON esperada na coluna 'details' da tabela 'plans'
 */
const PLAN_STRUCTURE = {
  features: {
    collaboration_tools: false,
    custom_branding: false,
    dark_mode: false,
    priority_support: false,
  },
  limits: {
    exports: {
      backups_monthly: 0,
      notes_monthly: 0,
    },
    max_notes: 0,
    max_projects: 0,
    max_team_members: 0,
    storage: {
      max_file_size_mb: 0,
      retention_days: null,
      total_monthly_upload_mb: 0,
    },
  },
  metadata: {
    is_trial_available: false,
    plan_tier: "free",
    version: "1.0",
  },
  weave_ai: {
    config: {
      available_models: [],
      context_window_messages: 0,
      default_model: "",
      max_tokens_per_message: 0,
      monthly_messages: 0,
    },
    enabled: false,
    features: [],
  },
};

/**
 * PATHS JSONB PARA VALIDAÇÃO E CONSUMO
 */
const PLAN_PATHS = {
  FEATURES: {
    COLLABORATION_TOOLS: "features.collaboration_tools",
    CUSTOM_BRANDING: "features.custom_branding",
    DARK_MODE: "features.dark_mode",
    PRIORITY_SUPPORT: "features.priority_support",
  },
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
  WEAVE_AI: {
    CONFIG: {
      AVAILABLE_MODELS: "weave_ai.config.available_models",
      CONTEXT_WINDOW: "weave_ai.config.context_window_messages",
      DEFAULT_MODEL: "weave_ai.config.default_model",
      MAX_TOKENS: "weave_ai.config.max_tokens_per_message",
      MONTHLY_MESSAGES: "weave_ai.config.monthly_messages",
    },
    ENABLED: "weave_ai.enabled",
    FEATURES: "weave_ai.features",
  },
};

/**
 * PATHS DE USO (plans_usage.usage_details)
 */
const USAGE_PATHS = {
  HISTORY: {
    LAST_ACTIVITY: "history_metadata.last_activity_at",
    USAGE_PERCENTAGE: "history_metadata.usage_percentage_total",
  },
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
      MESSAGES_SENT: "monthly_cycle.weave_ai.messages_sent",
      TOKENS_ESTIMATED: "monthly_cycle.weave_ai.tokens_estimated",
    },
  },
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
