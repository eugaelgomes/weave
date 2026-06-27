// src/config/api-scopes.js

/**
 * API Scopes Constants
 * Centralizes the definition of allowed scopes for API tokens.
 */
const API_SCOPES = {
  NOTES_READ: "notes:read",
  NOTES_WRITE: "notes:write",
  NOTES_DELETE: "notes:delete",
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  PROFILE_READ: "profile:read",
  ORGANIZATIONS_READ: "organizations:read",
  CALENDAR_READ: "calendar:read",
  CALENDAR_WRITE: "calendar:write",
  TAGS_READ: "tags:read",
  TAGS_WRITE: "tags:write",
  PRIORITIES_READ: "priorities:read",
  PRIORITIES_WRITE: "priorities:write",
  USERS_READ: "users:read",
  AI_CHAT: "ai:chat",
  AI_AGENTS: "ai:agents",
};

module.exports = {
  API_SCOPES,
};
