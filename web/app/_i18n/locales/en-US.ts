import type { TranslationKeys } from "./pt-BR";

const enUS: TranslationKeys = {
  common: {
    user: "User",
    username: "user",
    untitled: "Untitled",
    unnamed: "Unnamed",
    empty: "Empty",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    search: "Search",
    notes: "notes",
    projects: "projects",
  },

  greeting: {
    hello: "Hello,",
  },

  nav: {
    home: "Home",
    notes: "Notes",
    projects: "Projects",
    weaveAi: "Weave AI",
    chat: "Chat",
    agent: "Agent",
    notifications: "Notifications",
    calendar: "Calendar",
    organization: "Organization",
    settings: "Settings",
    members: "Members",
    menu: "Menu",
    expandMenu: "Expand menu",
    collapseMenu: "Collapse menu",
    recentAccess: "Recent Access",
    openSidebar: "Open sidebar",
    backToHome: "Back to home",
  },

  home: {
    metrics: "Metrics",
    totalNotes: "Total Notes",
    uniqueTags: "Unique Tags",
    totalProjects: "Total Projects",
    activeProjects: "Active Projects",
    tagCloud: "Tag Cloud",
    tagCloudDescription: "These are your most used tags",
    notEnoughTags: "Not enough tags",
  },

  navbar: {
    accountSettings: "Account Settings",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    aboutSystem: "About",
    logout: "Log out",
    closeMenu: "Close Menu",
  },

  settings: {
    title: "Account Settings",
    description: "Manage your personal data, organization, and security preferences.",
    passwordChangeHint: "To change your password, fill in all password fields.",
    passwordMismatch: "New password and confirmation do not match.",
    passwordTooShort: "New password must be at least 6 characters.",
    profileUpdated: "Profile updated successfully.",
    updateFailed: "Failed to update.",
    requestingBackup: "Requesting backup...",
    backupProcessing: "Backup in progress...",
    backupProgress: "Processing backup: {progress}%",
    backupDoneDownload: "Backup complete. Download started.",
    backupDoneEmail: "Backup complete. Check your email.",
    backupFailed: "Failed to generate backup",
    backupTakingLong: "Backup is taking longer than expected...",
    deleteAccountWarning:
      "WARNING: This action is irreversible. Do you really want to delete your account?",
    deleteAccountError: "Error deleting account.",
    deleteAccountCritical: "Critical error trying to delete account.",
    language: "Language",
    languageDescription: "Choose the interface language.",
  },
};

export default enUS;
