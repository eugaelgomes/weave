// src/config/api-scopes.js

/**
 * API Scopes Constants
 * Centralizes the definition of allowed scopes for API tokens.
 */
const API_SCOPES = {
  AI_AGENTS: "ai:agents",
  AI_CHAT: "ai:chat",
  CALENDAR_READ: "calendar:read",
  CALENDAR_WRITE: "calendar:write",
  NOTES_DELETE: "notes:delete",
  NOTES_READ: "notes:read",
  NOTES_WRITE: "notes:write",
  ORGANIZATIONS_READ: "workspaces:read",
  PRIORITIES_READ: "priorities:read",
  PRIORITIES_WRITE: "priorities:write",
  PROFILE_READ: "profile:read",
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  TAGS_READ: "tags:read",
  TAGS_WRITE: "tags:write",
  USERS_READ: "users:read",
};

module.exports = {
  API_SCOPES,
};
