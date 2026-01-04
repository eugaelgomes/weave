export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://10.0.0.104:8080/api";

// Configurações gerais da API
export const API_CONFIG = {
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const API_ENDPOINTS = {
  // Auth
  SIGNIN: "/auth/signin",
  SIGNUP: "/users/signup",
  LOGOUT: "/auth/logout",
  ME: "/users/me",
  REFRESH: "/auth/refresh",
  GOOGLE_AUTH: "/auth/signin/sso/google",

  // User Management
  UPDATE_PROFILE: "/users/me/update-profile",
  UPDATE_PASSWORD: "/users/me/update-password",
  DELETE_ACCOUNT: "/users/delete-my-account",
  CREATE_ACCOUNT: "/users/create-account",
  USERS: "/auth/users",

  // Password Recovery
  FORGOT_PASSWORD: "/password/forgot-password",
  RESET_PASSWORD: "/password/reset-password",

  // Notes
  NOTES: "/notes",
  NOTES_STATS: "/notes/stats",
  NOTES_BY_ID: (id: string) => `/notes/${id}`,
  NOTES_SEARCH: "/notes/search",
  NOTES_EXPORT: "/notes/export",

  // Projects
  PROJECTS: "/projects",
  PROJECTS_BY_ID: (id: string) => `/projects/${id}`,
  PROJECTS_COLLABORATORS: (projectId: string) => `/projects/${projectId}/collaborators`,
  PROJECTS_NOTES: (projectId: string) => `/projects/${projectId}/notes`,

  // Backup
  BACKUP_REQUEST: "/backup/request",
  BACKUP_STATUS: (jobId: string) => `/backup/status/${jobId}`,
  BACKUP_JOBS: "/backup/jobs",
  BACKUP_SUMMARY: "/backup/summary",

  // Health
  HEALTH: "/health",

  // Organizations
  ORGANIZATIONS: "/organizations",
  ORGANIZATIONS_PROPERTIES: "/organizations/properties",
  ORGANIZATIONS_RESTORE: "/organizations/restore",
  ORGANIZATIONS_MEMBERS: "/organizations/members",
  ORGANIZATIONS_MEMBER: (memberId: string) => `/organizations/members/${memberId}`,
  ORGANIZATIONS_LOGO: "/organizations/logo",
  ORGANIZATIONS_BANNER: "/organizations/banner",

  // AI
  AI_MODELS: "/weave-ai/models",
  AI_CHAT: "/weave-ai/chat",
  AI_CHAT_HISTORY: "/weave-ai/chat/history",
  AI_GENERATE: "/weave-ai/generate",
  AI_ANALYZE_NOTE: "/weave-ai/analyze-note",
  AI_ANALYZE_PROJECT: "/weave-ai/analyze-project",
  AI_RESEARCH: "/weave-ai/research",
  AI_USE_CASES: "/weave-ai/use-cases",
};
