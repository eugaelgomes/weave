const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const {
  PROJECT_WRITE_CAPABLE_ROLES,
} = require("@/modules/projects/project-role-policy");
const { resolveNoteIdToUuid } = require("@/utils/note-id-lookup");
const { getI18n } = require("./weave-ai-i18n.util");

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
  async assertNoteMutationAccess(
    userId,
    noteId,
    organizationId = null,
    lang = "pt"
  ) {
    const t = getI18n(lang);
    if (!noteId) {
      const error = new Error(t.noteIdRequired);
      error.code = "CHAT_NOTE_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const internalNoteId = await resolveNoteIdToUuid(noteId);
    if (!internalNoteId) {
      const error = new Error(t.noteNotFound);
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const summary = await notesRepository.getNoteAccessSummary(internalNoteId);
    if (!summary) {
      const error = new Error(t.noteNotFound);
      error.code = "CHAT_NOTE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (String(summary.user_id) === String(userId)) {
      return internalNoteId;
    }

    const isCollaborator = await notesRepository.isCollaborator(
      internalNoteId,
      userId
    );
    if (isCollaborator) {
      return internalNoteId;
    }

    if (organizationId && summary.project_id) {
      const scopedProjectRows =
        await projectsReadRepository.getProjectByIdWithOrgScope(
          summary.project_id,
          organizationId
        );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return internalNoteId;
      }
    }

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
  async assertProjectMutationAccess(
    userId,
    projectId,
    organizationId = null,
    lang = "pt"
  ) {
    const t = getI18n(lang);
    if (!projectId) {
      const error = new Error(t.projectIdRequired);
      error.code = "CHAT_PROJECT_ID_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    if (organizationId) {
      const scopedProjectRows =
        await projectsReadRepository.getProjectByIdWithOrgScope(
          projectId,
          organizationId
        );
      if (Array.isArray(scopedProjectRows) && scopedProjectRows.length > 0) {
        return;
      }
    }

    const ownerProjectRows = await projectsReadRepository.getProjectById(
      projectId,
      userId
    );
    if (Array.isArray(ownerProjectRows) && ownerProjectRows.length > 0) {
      return;
    }

    const collaboratorRole = await projectsReadRepository.getProjectMemberRole(
      projectId,
      userId
    );
    if (
      collaboratorRole &&
      PROJECT_WRITE_CAPABLE_ROLES.includes(
        String(collaboratorRole).toUpperCase()
      )
    ) {
      return;
    }

    const deniedError = new Error(t.projectAccessDenied);
    deniedError.code = "CHAT_PROJECT_ACCESS_DENIED";
    deniedError.statusCode = 403;
    throw deniedError;
  }
}

module.exports = new ChatAccessUtil();
