/**
 * @module weave-ai/handlers/create-note.handler
 * @description Tool handler to create a new note/task from AI chat.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For saving the new note and its blocks.
 * - `@/modules/projects/repositories/projects-read.repository`: To verify project scopes.
 * - `../utils/chat-access.util`: To verify user permissions.
 * - `../utils/markdown-to-blocks.util`: To convert markdown fallback text into TipTap blocks.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const spacesService = require("@/services/storage");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

const { markdownToBlocks } = require("../../utils/markdown-to-blocks.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");

class CreateNoteHandler {
  /**
   * Executes the tool logic to create a new note.
   *
   * @param {Object} context - The execution context provided by the chat orchestrator.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool being executed.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result payload.
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string, files: any[] } context
   */
  async execute({ userId, args, organizationId, lang, t, name, files }) {
    if (args.projectId) {
      await chatAccessUtil.assertProjectMutationAccess(
        userId,
        String(args.projectId),
        organizationId,
        lang
      );
    }

    const validTags = Array.isArray(args.tags)
      ? args.tags.filter((t) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            t
          )
        )
      : [];

    const createdNote = await notesRepository.createNotesQuery(
      userId,
      args.title || "New task",
      args.content || "",
      validTags,
      NOTE_STATUS.VISIBLE,
      args.projectId || null,
      args.priorityId || null
    );

    if (!createdNote || (!createdNote.id && !createdNote.note_id)) {
      throw new Error(t.noteCreateFailed);
    }

    const noteId = createdNote.id || createdNote.note_id;

    const updateData = {};
    if (args.projectId) {
      let resolvedStageId = args.stageId ? String(args.stageId) : null;
      if (!resolvedStageId) {
        resolvedStageId = await projectsReadRepository.getFirstProjectStageId(
          String(args.projectId)
        );
        if (!resolvedStageId) {
          throw new Error(t.projectNoStages);
        }
      } else {
        const stages = await projectsReadRepository.getProjectStages(
          String(args.projectId)
        );
        if (!stages.some((s) => String(s.id) === resolvedStageId)) {
          throw new Error(t.stageNotFound);
        }
      }
      updateData.project_stage_id = resolvedStageId;
    }
    if (args.dueDate) {
      try {
        const normalizedDueDate = new Date(String(args.dueDate)).toISOString();
        updateData.due_date = normalizedDueDate;
      } catch {
        // ignore invalid date
      }
    }

    const propertiesUpdate = {};
    if (Array.isArray(args.urls) && args.urls.length > 0)
      propertiesUpdate.urls = args.urls;

    if (Array.isArray(args.relations) && args.relations.length > 0)
      propertiesUpdate.relations = args.relations;

    if (
      Array.isArray(args.attachChatFiles) &&
      args.attachChatFiles.length > 0 &&
      Array.isArray(files)
    ) {
      const filesToUpload = files.filter((f) => {
        const fName = f.originalname || f.name;
        return args.attachChatFiles.includes(fName);
      });

      if (filesToUpload.length > 0) {
        const newFiles = await Promise.all(
          filesToUpload.map(async (file) => {
            const mimeType =
              file.mimetype || file.mimeType || "application/octet-stream";
            const originalName = file.originalname || file.name;
            const buffer = Buffer.isBuffer(file.buffer)
              ? file.buffer
              : Buffer.from(file.buffer || "", "base64"); // if it came as base64 but chat controller uses multer so it's buffer

            const result = await spacesService.uploadNoteFile(
              buffer,
              mimeType,
              noteId,
              userId,
              originalName
            );
            return {
              id: result.fileName,
              name: originalName,
              path: result.key || result.path || "",
              type: mimeType,
            };
          })
        );
        propertiesUpdate.files = [
          ...(propertiesUpdate.files || []),
          ...newFiles,
        ];
      }
    }

    if (Object.keys(propertiesUpdate).length > 0) {
      updateData.properties = propertiesUpdate;
    }

    if (Object.keys(updateData).length > 0) {
      await notesRepository.updateNoteById(noteId, updateData);
    }

    if (Array.isArray(args.blocks) && args.blocks.length > 0) {
      const tree = normalizeBlocksTree(args.blocks);
      await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
    } else if (
      typeof args.content === "string" &&
      args.content.trim().length > 0
    ) {
      const parsedBlocks = markdownToBlocks(args.content);
      await notesRepository.bulkInsertNoteBlocks(
        noteId,
        userId,
        normalizeBlocksTree(
          parsedBlocks.length > 0
            ? parsedBlocks
            : [
                {
                  id: newBlockId(),
                  properties: { text: args.content },
                  type: "paragraph",
                },
              ]
        )
      );
    } else {
      await notesRepository.insertDefaultNoteBlock(noteId, userId);
    }
    await enqueueNoteEmbeddingJob(noteId).catch(() => {});

    if (
      Array.isArray(args.collaboratorIds) &&
      args.collaboratorIds.length > 0
    ) {
      for (const collabId of args.collaboratorIds) {
        if (collabId && typeof collabId === "string") {
          const mayShare = await workspaceUserScopeRepository.usersMayInteract(
            userId,
            collabId
          );
          if (!mayShare) {
            const err = new Error(WORKSPACE_SHARE_DENIED.message);
            err.statusCode = 403;
            err.code = "WORKSPACE_SHARE_DENIED";
            throw err;
          }
          await notesRepository.addCollaborator(noteId, collabId);
        }
      }
    }

    let projectPublicId = null;
    if (args.projectId) {
      const projectRows = await projectsReadRepository.getProjectById(
        args.projectId,
        userId
      );
      if (projectRows?.length)
        projectPublicId = projectRows[0].public_project_id;
    }

    return {
      name,
      result: {
        created: true,
        noteId,
        projectPublicId,
        publicNoteId: createdNote.public_note_id,
      },
      success: true,
    };
  }
}

module.exports = new CreateNoteHandler();
