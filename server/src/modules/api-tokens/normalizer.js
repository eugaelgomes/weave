/**
 * Normalizer for API token scopes. This module defines the available scopes in the system and provides utility functions to validate and format scopes for API tokens.
 *
 * The scopes are defined as an array of objects, each containing an ID, a user-friendly name, and a description.
 * The normalizer provides a method to retrieve the scopes in a format suitable for frontend dropdowns and another method to validate user-provided scopes against the defined list.
 *
 * This helps ensure that only valid scopes are assigned to API tokens and provides a clear structure for managing permissions in the system.
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
];

class ApiTokensNormalizer {
  /**
   * Retorna os escopos padronizados para enviar ao frontend.
   * Utilizado para alimentar o menu suspenso (Select) de criação de tokens.
   */
  static getAvailableScopes() {
    return API_SCOPES.map((scope) => ({
      value: scope.id,
      label: scope.name,
      description: scope.description,
    }));
  }

  /**
   * Valida se uma lista de escopos fornecida pelo usuário contém apenas
   * escopos previamente registrados e permitidos pelo sistema.
   *
   * @param {string[]} scopes - Array de strings com os IDs dos escopos.
   * @returns {boolean} True se todos os escopos são válidos.
   */
  static areScopesValid(scopes) {
    if (!Array.isArray(scopes)) return false;
    if (scopes.length === 0) return true; // Pode querer permitir token sem escopo ou barrar (ajuste se necessário)

    const validScopeIds = API_SCOPES.map((s) => s.id);
    return scopes.every((scope) => validScopeIds.includes(scope));
  }
}

module.exports = ApiTokensNormalizer;
