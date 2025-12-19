export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

// Configurações gerais da API
export const API_CONFIG = {
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

// URLs específicas
export const API_ENDPOINTS = {
  // Auth
  SIGNIN: "/auth/signin",
  SIGNUP: "/auth/signup",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
  REFRESH: "/auth/refresh",
  GOOGLE_AUTH: "/auth/signin/sso/google",

  // User Management
  UPDATE_PROFILE: "/auth/me/update-profile",
  UPDATE_PASSWORD: "/auth/me/update-password",
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

  // AI
  AI_MODELS: "/ai/models",
  AI_CHAT: "/ai/chat",
  AI_CHAT_HISTORY: "/ai/chat/history",
  AI_GENERATE: "/ai/generate",
  AI_ANALYZE_NOTE: "/ai/analyze-note",
  AI_ANALYZE_PROJECT: "/ai/analyze-project",
  AI_RESEARCH: "/ai/research",
  AI_USE_CASES: "/ai/use-cases",
};
