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
const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const { PROJECT_WRITE_CAPABLE_ROLES } = require("@/modules/projects/project-role-policy");
const { resolveNoteIdToUuid } = require("@/modules/notes/utils/note-id-lookup.util");
const { getI18n } = require("./agent-house-i18n.util");

/**
 * Access control utility for Weave AI resources.
 * Enforces security boundaries for notes, tasks, and projects.
 */
class ChatAccessUtil {
  /**
   * Asserts that a user has mutation access to a note, checking ownership, collaboration,
   * or organizational scoping. Returns the resolved internal note UUID.
   *
   * @param {string} userId - The ID of the user requesting access.
   * @param {string} noteId - The internal UUID or public note ID to verify.
   * @param {string|null} [organizationId=null] - Optional organization ID for scope verification.
   * @param {string} [lang="pt"] - The language code for error translation.
   * @returns {Promise<string>} The resolved internal note UUID.
   * @throws {Error} If note is not found or access is denied.
   */
  async assertNoteMutationAccess(userId, noteId, organizationId = null, lang = "pt") {
    const t = getI18n(lang);

    // 1. Enforce presence of note identifier.
    if (!noteId) {
      const error = new Error(t.noteIdRequired);
      error.code = "CHAT_NOTE_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    // 2. Resolve external public IDs (e.g. from UI links) to internal database UUIDs.
    const internalNoteId = await resolveNoteIdToUuid(noteId);
    if (!internalNoteId) {
      const error = new Error(t.noteNotFound);
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // 3. Fetch base details for the note to check ownership.
    const summary = await notesRepository.getNoteAccessSummary(internalNoteId);
    if (!summary) {
      const error = new Error(t.noteNotFound);
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // Policy A: Direct owner access is always authorized.
    if (String(summary.user_id) === String(userId)) {
      return internalNoteId;
    }

    // Policy B: Explicit note collaborator checks.
    const isCollaborator = await notesRepository.isCollaborator(internalNoteId, userId);
    if (isCollaborator) {
      return internalNoteId;
    }

    // Policy C: Organizational project-level workspace access.
    // If the note belongs to a project, and the project is bound to the user's current
    // organization workspace, the user is authorized.
    if (organizationId && summary.project_id) {
      const scopedProjectRows = await projectsReadRepository.getProjectByIdWithOrgScope(
        summary.project_id,
        organizationId
      );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return internalNoteId;
      }
    }

    // Policy D: Fail closed if no rules matched.
    const deniedError = new Error(t.noteAccessDenied);
    deniedError.code = "CHAT_NOTE_ACCESS_DENIED";
    deniedError.statusCode = 403;
    throw deniedError;
  }

  /**
   * Asserts that a user has mutation access to a project, checking ownership, organization scope,
   * or collaborator role permissions.
   *
   * @param {string} userId - The ID of the user requesting access.
   * @param {string} projectId - The project ID to verify.
   * @param {string|null} [organizationId=null] - Optional organization ID for scope verification.
   * @param {string} [lang="pt"] - The language code for error translation.
   * @returns {Promise<void>} Resolves if access is authorized.
   * @throws {Error} If project ID is missing or access is denied.
   */
  async assertProjectMutationAccess(userId, projectId, organizationId = null, lang = "pt") {
    const t = getI18n(lang);

    // 1. Enforce presence of project identifier.
    if (!projectId) {
      const error = new Error(t.projectIdRequired);
      error.code = "CHAT_PROJECT_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    // Policy A: Organization scoping check.
    // If the project is linked to the active workspace organization, verify existence/membership.
    if (organizationId) {
      const scopedProjectRows = await projectsReadRepository.getProjectByIdWithOrgScope(
        projectId,
        organizationId
      );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return;
      }
    }

    // Policy B: Direct project owner check.
    const ownerProjectRows = await projectsReadRepository.getProjectById(projectId, userId);
    if (Array.isArray(ownerProjectRows) && ownerProjectRows.length > 0) {
      return;
    }

    // Policy C: Collaborator roles check.
    // Ensure user has a role inside the project that grants write permissions (e.g. PROJECT_MANAGER, CONTRIBUTOR).
    const collaboratorRole = await projectsReadRepository.getProjectMemberRole(projectId, userId);
    if (
      collaboratorRole &&
      PROJECT_WRITE_CAPABLE_ROLES.includes(String(collaboratorRole).toUpperCase())
    ) {
      return;
    }

    // Policy D: Access denied if unauthorized.
    const deniedError = new Error(t.projectAccessDenied);
    deniedError.code = "CHAT_PROJECT_ACCESS_DENIED";
    deniedError.statusCode = 403;
    throw deniedError;
  }
}

module.exports = new ChatAccessUtil();
