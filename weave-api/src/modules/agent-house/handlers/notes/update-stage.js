/**
 * @module agent-house/handlers/update-note-stage.handler
 * @description Tool handler to update the stage of a note inside a project board.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For updating note stage.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

class UpdateNoteStageHandler {
  /**
   * Executes the tool logic to update a note's stage.
   *
   * @param {Object} context - The execution context.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result.
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string } context
   */
  async execute({ userId, args, organizationId, lang, t, name }) {
    const noteId = await chatAccessUtil.assertNoteMutationAccess(
      userId,
      String(args.noteId || ""),
      organizationId,
      lang
    );
    const note = await notesRepository.getNoteById(noteId);
    if (!note?.project_id) {
      throw new Error(t.noteNotAssociatedToProject);
    }
    const projectId = String(note.project_id);
    const parsedStageId =
      args.stageId === undefined || args.stageId === null || args.stageId === ""
        ? null
        : String(args.stageId);
    if (!parsedStageId) {
      throw new Error(t.stageRequired);
    }
    const stages = await projectsReadRepository.getProjectStages(projectId);
    if (!stages.some((s) => String(s.id) === parsedStageId)) {
      throw new Error(t.stageNotFound);
    }
    const result = await notesRepository.updateNoteById(noteId, {
      project_stage_id: parsedStageId,
    });
    return {
      name,
      result: { noteId, updated: Boolean(result) },
      success: true,
    };
  }
}

module.exports = new UpdateNoteStageHandler();
