/**
 * @typedef {Object} AppPreferencesNotifications
 * @property {boolean} email
 * @property {boolean} push
 * @property {boolean} browser
 * @property {boolean} sound
 * @property {boolean} collaborationInvites
 * @property {boolean} projectUpdates
 * @property {boolean} mentionsAndComments
 */

/**
 * @typedef {Object} AppPreferencesEditor
 * @property {number} fontSize
 * @property {string} fontFamily
 * @property {number} lineHeight
 * @property {boolean} autoSave
 * @property {number} autoSaveDelay
 * @property {boolean} spellCheck
 * @property {boolean} syntaxHighlighting
 */

/**
 * @typedef {Object} AppPreferencesDisplay
 * @property {'compact'|'comfortable'|'spacious'} density
 * @property {'left'|'right'} sidebarPosition
 * @property {boolean} showLineNumbers
 * @property {boolean} showWordCount
 * @property {boolean} compactMode
 */

/**
 * @typedef {Object} AppPreferencesLanguage
 * @property {string} ["interface"] BCP 47 locale for the UI (e.g. `pt-BR`).
 * @property {string} spellCheckLanguage
 * @property {string} dateFormat
 * @property {'12h'|'24h'} timeFormat
 */

/**
 * @typedef {Object} AppPreferencesPrivacy
 * @property {boolean} shareUsageData
 * @property {boolean} showOnlineStatus
 * @property {boolean} allowAnalytics
 */

/**
 * @typedef {Object} AppPreferencesCollaboration
 * @property {'view'|'edit'} defaultPermission
 * @property {boolean} autoAcceptInvites
 * @property {boolean} showCollaboratorCursors
 */

/**
 * @typedef {Object} AppPreferencesAi
 * @property {boolean} enabled
 * @property {boolean} autoSuggestions
 * @property {boolean} contextAwareAssistance
 * @property {number} historyRetention
 */

/**
 * @typedef {Object} AppPreferencesBackup
 * @property {boolean} autoBackup
 * @property {'realtime'|'daily'|'weekly'|'manual'} backupFrequency
 * @property {number} retentionPeriod
 */

/**
 * @typedef {Object} AppPreferencesShortcuts
 * @property {boolean} enabled
 * @property {Record<string, unknown>} customShortcuts
 */

/**
 * Full application preference tree stored on the user record.
 *
 * @typedef {Object} AppPreferences
 * @property {AppPreferencesNotifications} notifications
 * @property {AppPreferencesEditor} editor
 * @property {AppPreferencesDisplay} display
 * @property {AppPreferencesLanguage} language
 * @property {AppPreferencesPrivacy} privacy
 * @property {AppPreferencesCollaboration} collaboration
 * @property {AppPreferencesAi} ai
 * @property {AppPreferencesBackup} backup
 * @property {AppPreferencesShortcuts} shortcuts
 */

/**
 * Default preferences applied when creating a user or filling missing keys.
 *
 * @type {AppPreferences}
 */
const defaultAppPreferences = {
  ai: {
    autoSuggestions: true,
    contextAwareAssistance: true,
    enabled: true,
    historyRetention: 30, // days
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily", // realtime, daily, weekly, manual
    retentionPeriod: 30, // days
  },
  collaboration: {
    // view, edit
    autoAcceptInvites: false,
    defaultPermission: "view",
    showCollaboratorCursors: true,
  },
  Display: {
    compactMode: false,

    density: "comfortable",

    // left, right
    showLineNumbers: false,

    showWordCount: true,
    // compact, comfortable, spacious
    sidebarPosition: "left",
  },
  editor: {
    autoSave: true,
    autoSaveDelay: 2000,
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.6, // milliseconds
    spellCheck: true,
    syntaxHighlighting: true,
  },
  language: {
    dateFormat: "DD/MM/YYYY",
    interface: "pt-BR",
    spellCheckLanguage: "pt-BR",
    timeFormat: "24h", // 12h, 24h
  },
  notifications: {
    browser: true,
    collaborationInvites: true,
    email: true,
    mentionsAndComments: true,
    projectUpdates: true,
    push: true,
    sound: true,
  },
  privacy: {
    allowAnalytics: false,
    shareUsageData: false,
    showOnlineStatus: true,
  },
  shortcuts: {
    customShortcuts: {},
    enabled: true,
  },
};

/**
 * Merges user-provided preference fragments with `defaultAppPreferences`
 * (shallow merge per top-level section).
 *
 * @param {Partial<AppPreferences>} [userPreferences]
 * @returns {AppPreferences}
 */
function normalizeAppPreferences(userPreferences = {}) {
  return {
    ai: {
      ...defaultAppPreferences.ai,
      ...(userPreferences.ai || {}),
    },
    backup: {
      ...defaultAppPreferences.backup,
      ...(userPreferences.backup || {}),
    },
    collaboration: {
      ...defaultAppPreferences.collaboration,
      ...(userPreferences.collaboration || {}),
    },
    Display: {
      ...defaultAppPreferences.Display,
      ...(userPreferences.Display || userPreferences.display || {}),
    },
    editor: {
      ...defaultAppPreferences.editor,
      ...(userPreferences.editor || {}),
    },
    language: {
      ...defaultAppPreferences.language,
      ...(userPreferences.language || {}),
    },
    notifications: {
      ...defaultAppPreferences.notifications,
      ...(userPreferences.notifications || {}),
    },
    privacy: {
      ...defaultAppPreferences.privacy,
      ...(userPreferences.privacy || {}),
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
