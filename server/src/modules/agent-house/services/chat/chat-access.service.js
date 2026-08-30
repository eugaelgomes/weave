/**
 * @module agent-house/utils/chat-access.util
 * @description Access control utility for Weave AI resources.
 * Ensures that users have the correct permissions to mutate notes or projects.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For fetching note access summaries and collaborator data.
 * - `@/modules/projects/repositories/projects-read.repository`: For project scope and role checks.
 * - `@/modules/notes/utils/note-id-lookup.util`: To resolve public UUIDs to internal DB UUIDs.
 * - `./agent-house-i18n.util`: For localized error messages.
 *
 * Used by:
 * - `agent-house/handlers/*`: Specifically handlers that mutate resources (e.g. `update-note-content.handler.js`).
 */

/**
 * Access control utility for Weave AI resources.
 * Enforces security boundaries for notes, tasks, and projects.
 */
class ChatAccessService {
  /**
   * Asserts that a user has mutation access to a note, checking ownership, collaboration,
   * or organizational scoping. Returns the resolved internal note UUID.
   *
   * @param {string} userId - The ID of the user requesting access.
   * @param {string} noteId - The internal UUID or public note ID to verify.
   * @param {string|null} [workspaceId=null] - Optional workspace ID for scope verification.
   * @param {string} [lang="pt"] - The language code for error translation.
   * @returns {Promise<string>} The resolved internal note UUID.
   * @throws {Error} If note is not found or access is denied.
   */
  async assertNoteMutationAccess(userId, noteId, _workspaceId = null, _lang = "pt") {
    const error = new Error("Notes feature has been deprecated in favor of unified AI memory.");
    error.code = "CHAT_NOTE_DEPRECATED";
    error.statusCode = 400;
    throw error;
  }

  /**
   * Asserts that a user has mutation access to a project, checking ownership, workspace scope,
   * or collaborator role permissions.
   *
   * @param {string} userId - The ID of the user requesting access.
   * @param {string} projectId - The project ID to verify.
   * @param {string|null} [workspaceId=null] - Optional workspace ID for scope verification.
   * @param {string} [lang="pt"] - The language code for error translation.
   * @returns {Promise<void>} Resolves if access is authorized.
   * @throws {Error} If project ID is missing or access is denied.
   */
  async assertProjectMutationAccess(userId, projectId, _workspaceId = null, _lang = "pt") {
    const error = new Error("Projects feature has been deprecated in favor of unified Teams.");
    error.code = "CHAT_PROJECT_DEPRECATED";
    error.statusCode = 400;
    throw error;
  }
}

module.exports = new ChatAccessService();
