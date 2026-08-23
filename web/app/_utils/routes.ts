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

  organization: {
    general: () => `/organization/general/`,
    create: () => `/organization/create/`,
    plans: () => `/organization/plans/`,
    integrations: () => `/organization/integrations/`,
    membersList: () => `/organization/members/list/`,
    membersInvites: () => `/organization/members/invites/`,
    areas: () => `/organization/areas/`,
    projects: () => `/organization/projects/`,
    editor: () => `/organization/editor/`,
    about: () => `/organization/about/`,
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
