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

  // Org Scoped Routes
  home: (orgId: string) => `/${orgId}/new/`,

  projects: {
    list: (orgId: string) => `/${orgId}/projects/`,
    new: (orgId: string) => `/${orgId}/projects/new/`,
    details: (orgId: string, projectId: string) => `/${orgId}/projects/${projectId}/details/`,
    board: (orgId: string, projectId: string) => `/${orgId}/projects/${projectId}/`,
    task: (orgId: string, projectId: string, taskId: string) =>
      `/${orgId}/projects/${projectId}/tasks/${taskId}/`,
  },

  notes: {
    list: (orgId: string) => `/${orgId}/notes/`,
    details: (orgId: string, noteId: string) => `/${orgId}/notes/${noteId}/`,
  },



  weaveFlow: {
    base: (orgId: string) => `/${orgId}/weave-flow/`,
  },

  weaveAi: {
    base: (orgId: string) => `/${orgId}/weave-ai/`,
    chat: (orgId: string) => `/${orgId}/weave-ai/chat/`,
    chatSession: (orgId: string, sessionId: string) => `/${orgId}/weave-ai/chat/${sessionId}/`,
    newAgent: (orgId: string) => `/${orgId}/weave-ai/agents/new/`,
    agentDetails: (orgId: string, agentId: string) => `/${orgId}/weave-ai/agents/${agentId}/`,
  },

  agentHouse: {
    base: (orgId: string) => `/${orgId}/agent-house/`,
    llms: (orgId: string) => `/${orgId}/agent-house/llms/`,
    tools: (orgId: string) => `/${orgId}/agent-house/tools/`,
  },

  organization: {
    general: (orgId: string) => `/${orgId}/organization/general/`,
    create: (orgId: string) => `/${orgId}/organization/create/`,
    plans: (orgId: string) => `/${orgId}/organization/plans/`,
    integrations: (orgId: string) => `/${orgId}/organization/integrations/`,
    membersList: (orgId: string) => `/${orgId}/organization/members/list/`,
    membersInvites: (orgId: string) => `/${orgId}/organization/members/invites/`,
    areas: (orgId: string) => `/${orgId}/organization/areas/`,
    projects: (orgId: string) => `/${orgId}/organization/projects/`,
    editor: (orgId: string) => `/${orgId}/organization/editor/`,
    about: (orgId: string) => `/${orgId}/organization/about/`,
  },

  settings: {
    base: (orgId: string) => `/${orgId}/settings/`,
    plans: (orgId: string) => `/${orgId}/settings/plans/`,
    clientTokens: (orgId: string) => `/${orgId}/settings/client-tokens/`,
    integrations: (orgId: string) => `/${orgId}/settings/integrations/`,
    security: (orgId: string) => `/${orgId}/settings/security/`,
    userData: (orgId: string) => `/${orgId}/settings/user-data/`,
    preferences: (orgId: string) => `/${orgId}/settings/preferences/`,
    dangerZone: (orgId: string) => `/${orgId}/settings/danger-zone/`,
  },
};
