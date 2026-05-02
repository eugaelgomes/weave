/* eslint-disable sort-keys */
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
 * @property {string} appBackgroundColor
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
  Display: {
    density: "comfortable", // compact, comfortable, spacious
    sidebarPosition: "left", // left, right
    showLineNumbers: false,
    showWordCount: true,
    compactMode: false,
    appBackgroundColor: "#191919",
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
 * Merges user-provided preference fragments with `defaultAppPreferences`
 * (shallow merge per top-level section).
 *
 * @param {Partial<AppPreferences>} [userPreferences]
 * @returns {AppPreferences}
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
    Display: {
      ...defaultAppPreferences.Display,
      ...(userPreferences.Display || userPreferences.display || {}),
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
