const defaultAppPreferences = {
  notifications: {
    email: true,
    push: true,
    browser: true,
    sound: true,
    collaborationInvites: true,
    projectUpdates: true,
    mentionsAndComments: true,
  },
  editor: {
    fontSize: 14,
    fontFamily: "Inter, system-ui, sans-serif",
    lineHeight: 1.6,
    autoSave: true,
    autoSaveDelay: 2000, // milliseconds
    spellCheck: true,
    syntaxHighlighting: true,
  },
  display: {
    density: "comfortable", // compact, comfortable, spacious
    sidebarPosition: "left", // left, right
    showLineNumbers: false,
    showWordCount: true,
    compactMode: false,
  },
  language: {
    interface: "pt-BR",
    spellCheckLanguage: "pt-BR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h", // 12h, 24h
  },
  privacy: {
    shareUsageData: false,
    showOnlineStatus: true,
    allowAnalytics: false,
  },
  collaboration: {
    defaultPermission: "view", // view, edit
    autoAcceptInvites: false,
    showCollaboratorCursors: true,
  },
  ai: {
    enabled: true,
    autoSuggestions: true,
    contextAwareAssistance: true,
    historyRetention: 30, // days
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily", // realtime, daily, weekly, manual
    retentionPeriod: 30, // days
  },
  shortcuts: {
    enabled: true,
    customShortcuts: {},
  },
};

/**
 * Normalizes user app preferences by merging with default values
 * @param {Object} userPreferences - User's custom preferences
 * @returns {Object} Normalized preferences with defaults for missing values
 */
function normalizeAppPreferences(userPreferences = {}) {
  return {
    notifications: {
      ...defaultAppPreferences.notifications,
      ...(userPreferences.notifications || {}),
    },
    editor: {
      ...defaultAppPreferences.editor,
      ...(userPreferences.editor || {}),
    },
    display: {
      ...defaultAppPreferences.display,
      ...(userPreferences.display || {}),
    },
    language: {
      ...defaultAppPreferences.language,
      ...(userPreferences.language || {}),
    },
    privacy: {
      ...defaultAppPreferences.privacy,
      ...(userPreferences.privacy || {}),
    },
    collaboration: {
      ...defaultAppPreferences.collaboration,
      ...(userPreferences.collaboration || {}),
    },
    ai: {
      ...defaultAppPreferences.ai,
      ...(userPreferences.ai || {}),
    },
    backup: {
      ...defaultAppPreferences.backup,
      ...(userPreferences.backup || {}),
    },
    shortcuts: {
      ...defaultAppPreferences.shortcuts,
      ...(userPreferences.shortcuts || {}),
    },
  };
}

module.exports = {
  defaultAppPreferences,
  normalizeAppPreferences,
}; 