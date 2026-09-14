/**
 * Centralized Route Generator for The Weave
 * Used to avoid hardcoding org-scoped URLs throughout the application.
 */

export const routes = {
  // Global & Auth Routes
  auth: {
    signIn: () => "/auth/sign-in/",
    signUp: () => "/auth/sign-up/",
    activate: () => "/activate/",
  },

  // App Scoped Routes
  home: () => `/chat/`,

  projects: {
    list: () => `/projects/`,
    new: () => `/projects/new/`,
    details: (projectId: string) => `/projects/${projectId}/details/`,
    board: (projectId: string) => `/projects/${projectId}/`,
    task: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}/`,
  },

  notes: {
    list: () => `/notes/`,
    details: (noteId: string) => `/notes/${noteId}/`,
  },

  weaveFlow: {
    base: () => `/weave-flow/`,
  },

  weaveAi: {
    base: () => `/weave-ai/`,
    chat: () => `/weave-ai/chat/`,
    chatSession: (sessionId: string) => `/weave-ai/chat/${sessionId}/`,
    newAgent: () => `/weave-ai/agents/new/`,
    agentDetails: (agentId: string) => `/weave-ai/agents/${agentId}/`,
  },

  agentHouse: {
    base: () => `/agent-house/`,
    llms: () => `/agent-house/llms/`,
    tools: () => `/agent-house/tools/`,
  },

  workspace: {
    dashboard: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/dashboard/`,
    general: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/settings/general/`,
    create: () => `/workspace/create/`,
    plans: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/settings/plans/`,
    integrations: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/settings/integrations/`,
    membersList: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/members/list/`,
    membersInvites: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/members/invites/`,
    areas: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/areas/`,
    projects: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/projects/`,
    editor: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/editor/`,
    about: (workspacePublicId: string) =>
      `/workspace/${encodeURIComponent(workspacePublicId)}/about/`,
  },

  settings: {
    base: () => `/settings/`,
    plans: () => `/settings/plans/`,
    clientTokens: () => `/settings/client-tokens/`,
    integrations: () => `/settings/integrations/`,
    security: () => `/settings/security/`,
    userData: () => `/settings/user-data/`,
    preferences: () => `/settings/preferences/`,
    dangerZone: () => `/settings/danger-zone/`,
  },
};
