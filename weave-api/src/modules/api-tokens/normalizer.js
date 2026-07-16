/**
 * API token scope definitions and validation utilities.
 */
const { API_SCOPES: SCOPES } = require("@/config/api-scopes");

const API_SCOPES = [
  {
    description:
      "Allows listing and viewing the content of all notes the user has access to.",
    id: SCOPES.NOTES_READ,
    name: "Read Notes",
  },
  {
    description:
      "Allows creating new notes and modifying existing ones (requires appropriate permissions).",
    id: SCOPES.NOTES_WRITE,
    name: "Create/Edit Notes",
  },
  {
    description: "Allows moving notes to trash or deleting them permanently.",
    id: SCOPES.NOTES_DELETE,
    name: "Delete Notes",
  },
  {
    description: "Allows viewing projects and their associated data.",
    id: SCOPES.PROJECTS_READ,
    name: "Read Projects",
  },
  {
    description: "Allows creating new projects and modifying existing ones.",
    id: SCOPES.PROJECTS_WRITE,
    name: "Create/Edit Projects",
  },
  {
    description: "Allows access to basic user data (name, ID, avatar).",
    id: SCOPES.PROFILE_READ,
    name: "Read Profile",
  },
  {
    description: "Allows viewing organizational data and members.",
    id: SCOPES.ORGANIZATIONS_READ,
    name: "Read Organizations",
  },
  {
    description:
      "Allows reading events related to calendars and scheduled tasks.",
    id: SCOPES.CALENDAR_READ,
    name: "Read Calendar Events",
  },
  {
    description: "Allows creating, updating, and managing calendar events.",
    id: SCOPES.CALENDAR_WRITE,
    name: "Create/Edit Calendar Events",
  },
  {
    description: "Allows reading organization and project tags.",
    id: SCOPES.TAGS_READ,
    name: "Read Tags",
  },
  {
    description: "Allows creating, updating and deleting tags.",
    id: SCOPES.TAGS_WRITE,
    name: "Manage Tags",
  },
  {
    description: "Allows reading organization and project task priorities.",
    id: SCOPES.PRIORITIES_READ,
    name: "Read Task Priorities",
  },
  {
    description: "Allows creating, updating and deleting task priorities.",
    id: SCOPES.PRIORITIES_WRITE,
    name: "Manage Task Priorities",
  },
  {
    description:
      "Allows searching and reading user profiles within the organization.",
    id: SCOPES.USERS_READ,
    name: "Read Users",
  },
  {
    description: "Allows interacting with Weave AI chat and listing models.",
    id: SCOPES.AI_CHAT,
    name: "Use AI Chat",
  },
  {
    description: "Allows reading and managing Weave AI agents.",
    id: SCOPES.AI_AGENTS,
    name: "Manage AI Agents",
  },
];

class ApiTokensNormalizer {
  /**
   * Returns API scopes formatted for frontend selection components.
   * @returns {Array<{value: string, label: string, description: string}>}
   */
  static getAvailableScopes() {
    return API_SCOPES.map((scope) => ({
      description: scope.description,
      label: scope.name,
      value: scope.id,
    }));
  }

  /**
   * Validates if the given scopes exist in the system.
   * @param {string[]} scopes - Scope IDs to validate.
   * @returns {boolean}
   */
  static areScopesValid(scopes) {
    if (!Array.isArray(scopes)) return false;
    if (scopes.length === 0) return true; // Allows tokens without scopes

    const validScopeIds = API_SCOPES.map((s) => s.id);
    return scopes.every((scope) => validScopeIds.includes(scope));
  }
}

module.exports = ApiTokensNormalizer;
