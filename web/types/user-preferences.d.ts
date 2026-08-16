export interface UserPreferences {
  notifications?: {
    email?: boolean;
    push?: boolean;
    browser?: boolean;
    sound?: boolean;
    collaborationInvites?: boolean;
    projectUpdates?: boolean;
    mentionsAndComments?: boolean;
  };
  editor?: {
    fontSize?: number;
    fontFamily?: string;
    lineHeight?: number;
    autoSave?: boolean;
    autoSaveDelay?: number;
    spellCheck?: boolean;
    syntaxHighlighting?: boolean;
  };
  display?: {
    density?: "compact" | "comfortable" | "spacious";
    sidebarPosition?: "left" | "right";
    showLineNumbers?: boolean;
    showWordCount?: boolean;
    compactMode?: boolean;
  };
  language?: {
    interface?: string;
    spellCheckLanguage?: string;
    dateFormat?: string;
    timeFormat?: "12h" | "24h";
  };
  privacy?: {
    shareUsageData?: boolean;
    showOnlineStatus?: boolean;
    allowAnalytics?: boolean;
  };
  collaboration?: {
    defaultPermission?: "view" | "edit";
    autoAcceptInvites?: boolean;
    showCollaboratorCursors?: boolean;
  };
  ai?: {
    enabled?: boolean;
    autoSuggestions?: boolean;
    contextAwareAssistance?: boolean;
    historyRetention?: number;
  };
  backup?: {
    autoBackup?: boolean;
    backupFrequency?: "realtime" | "daily" | "weekly" | "manual";
    retentionPeriod?: number;
  };
  shortcuts?: {
    enabled?: boolean;
    customShortcuts?: Record<string, string>;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: {
    interface: "pt-BR",
    spellCheckLanguage: "pt-BR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
  },
};
