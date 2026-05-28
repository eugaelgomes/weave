/**
 * API token scope definitions and validation utilities.
 */
const API_SCOPES = [
  {
    id: "notes:read",
    name: "Read Notes",
    description:
      "Allows listing and viewing the content of all notes the user has access to.",
  },
  {
    id: "notes:write",
    name: "Create/Edit Notes",
    description:
      "Allows creating new notes and modifying existing ones (requires appropriate permissions).",
  },
  {
    id: "notes:delete",
    name: "Delete Notes",
    description: "Allows moving notes to trash or deleting them permanently.",
  },
  {
    id: "projects:read",
    name: "Read Projects",
    description: "Allows viewing projects and their associated data.",
  },
  {
    id: "projects:write",
    name: "Create/Edit Projects",
    description: "Allows creating new projects and modifying existing ones.",
  },
  {
    id: "profile:read",
    name: "Read Profile",
    description: "Allows access to basic user data (name, ID, avatar).",
  },
  {
    id: "organizations:read",
    name: "Read Organizations",
    description: "Allows viewing organizational data and members.",
  },
  {
    id: "calendar:read",
    name: "Read Calendar Events",
    description:
      "Allows reading events related to calendars and scheduled tasks.",
  },
  {
    id: "calendar:write",
    name: "Create/Edit Calendar Events",
    description: "Allows creating, updating, and managing calendar events.",
  },
  {
    id: "tags:read",
    name: "Read Tags",
    description: "Allows reading organization and project tags.",
  },
  {
    id: "tags:write",
    name: "Manage Tags",
    description: "Allows creating, updating and deleting tags.",
  },
  {
    id: "priorities:read",
    name: "Read Task Priorities",
    description: "Allows reading organization and project task priorities.",
  },
  {
    id: "priorities:write",
    name: "Manage Task Priorities",
    description: "Allows creating, updating and deleting task priorities.",
  },
  {
    id: "users:read",
    name: "Read Users",
    description: "Allows searching and reading user profiles within the organization.",
  },
  {
    id: "ai:chat",
    name: "Use AI Chat",
    description: "Allows interacting with Weave AI chat and listing models.",
  },
  {
    id: "ai:agents",
    name: "Manage AI Agents",
    description: "Allows reading and managing Weave AI agents.",
  },
];

class ApiTokensNormalizer {
  /**
   * Returns API scopes formatted for frontend selection components.
   * @returns {Array<{value: string, label: string, description: string}>}
   */
  static getAvailableScopes() {
    return API_SCOPES.map((scope) => ({
      value: scope.id,
      label: scope.name,
      description: scope.description,
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
