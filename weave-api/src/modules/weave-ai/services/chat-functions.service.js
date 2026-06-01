const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../utils/chat-access.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");
const { getI18n } = require("../utils/weave-ai-i18n.util");
const spacesService = require("@/services/storage");

class ChatFunctionsService {
  /**
   * Execute a single authorized tool/function call.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {{name: string, arguments?: Record<string, unknown>}} functionCall - The tool execution details.
   * @param {string|null} [organizationId=null] - Optional organization ID scope for the call.
   * @param {string} [lang="pt"] - User language for error translations.
   * @returns {Promise<{name: string, success: boolean, result?: object}>} Result of the tool execution.
   */
  async executeFunctionCall(
    userId,
    functionCall,
    organizationId = null,
    lang = "pt"
  ) {
    const t = getI18n(lang);
    const name = String(functionCall?.name || "");
    const args =
      functionCall?.arguments && typeof functionCall.arguments === "object"
        ? functionCall.arguments
        : {};

    switch (name) {
      case "create_note": {
        if (args.projectId) {
          await chatAccessUtil.assertProjectMutationAccess(
            userId,
            String(args.projectId),
            organizationId,
            lang
          );
        }

        const createdNote = await notesRepository.createNotesQuery(
          userId,
          args.title || "Nova Tarefa",
          args.content || "",
          Array.isArray(args.tags) ? args.tags : [],
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
            resolvedStageId =
              await projectsReadRepository.getFirstProjectStageId(
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
            const normalizedDueDate = new Date(
              String(args.dueDate)
            ).toISOString();
            updateData.due_date = normalizedDueDate;
          } catch (e) {
            // ignore invalid date
          }
        }

        const propertiesUpdate = {};
        if (Array.isArray(args.urls) && args.urls.length > 0)
          propertiesUpdate.urls = args.urls;
        if (Array.isArray(args.files) && args.files.length > 0)
          propertiesUpdate.files = args.files;
        if (Array.isArray(args.relations) && args.relations.length > 0)
          propertiesUpdate.relations = args.relations;

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
          await notesRepository.bulkInsertNoteBlocks(
            noteId,
            userId,
            normalizeBlocksTree([
              {
                id: newBlockId(),
                type: "paragraph",
                properties: { text: args.content },
              },
            ])
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
              const mayShare =
                await workspaceUserScopeRepository.usersMayInteract(
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
            noteId,
            publicNoteId: createdNote.public_note_id,
            projectPublicId,
            created: true,
          },
          success: true,
        };
      }
      case "update_note_title": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const result = await notesRepository.updateNoteById(noteId, {
          title: args.title,
        });
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      }
      case "update_note_content": {
        const rawNoteId = String(args.noteId || "");
        if (!rawNoteId) {
          throw new Error(t.updateNoteContentIdRequired);
        }
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          rawNoteId,
          organizationId,
          lang
        );

        let tree;
        if (Array.isArray(args.blocks) && args.blocks.length > 0) {
          tree = normalizeBlocksTree(args.blocks);
        } else if (
          typeof args.content === "string" &&
          args.content.trim().length > 0
        ) {
          tree = [
            {
              id: newBlockId(),
              type: "paragraph",
              properties: { text: args.content },
            },
          ];
        } else {
          const error = new Error(t.updateNoteContentEmpty);
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        if (!chatFormatterUtil.blocksTreeHasMeaningfulText(tree)) {
          const error = new Error(t.updateNoteContentNoText);
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        await notesRepository.deleteAllNoteBlocks(noteId);
        await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
        await enqueueNoteEmbeddingJob(noteId).catch(() => {});

        return {
          name,
          result: { noteId, updated: true },
          success: true,
        };
      }
      case "update_note_stage": {
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
          args.stageId === undefined ||
          args.stageId === null ||
          args.stageId === ""
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
      case "update_note_priority": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const result = await notesRepository.updateNoteById(noteId, {
          priority_id: args.priorityId || null,
        });
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      }
      case "update_note_due_date": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const normalizedDueDate = args.dueDate
          ? new Date(String(args.dueDate)).toISOString()
          : null;
        const result = await notesRepository.updateNoteById(noteId, {
          due_date: normalizedDueDate,
        });
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      }
      case "update_note_tags": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const tags = Array.isArray(args.tags) ? args.tags : [];
        const result = await notesRepository.updateNoteById(noteId, {
          tags,
        });
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      }
      case "update_note_collaborator_add": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const collabUid = String(args.collaboratorUserId || "");
        if (!collabUid) {
          const error = new Error(t.collabIdRequired);
          error.statusCode = 400;
          throw error;
        }
        const mayShare = await workspaceUserScopeRepository.usersMayInteract(
          userId,
          collabUid
        );
        if (!mayShare) {
          const err = new Error(WORKSPACE_SHARE_DENIED.message);
          err.statusCode = 403;
          err.code = "WORKSPACE_SHARE_DENIED";
          throw err;
        }
        const result = await notesRepository.addCollaborator(noteId, collabUid);
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      }
      case "update_note_collaborator_remove": {
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          String(args.noteId || ""),
          organizationId,
          lang
        );
        const result = await notesRepository.removeCollaborator(
          noteId,
          args.collaboratorUserId
        );
        return {
          name,
          result: { noteId, rowCount: Number(result?.rowCount || 0) },
          success: true,
        };
      }
      case "update_project_title": {
        await chatAccessUtil.assertProjectMutationAccess(
          userId,
          String(args.projectId || ""),
          organizationId,
          lang
        );
        const result = await projectsUpdateRepository.updateProject(
          args.projectId,
          userId,
          {
            title: args.title,
          }
        );
        return {
          name,
          result: {
            projectId: args.projectId,
            updated: Array.isArray(result) && result.length > 0,
          },
          success: true,
        };
      }
      case "search_users": {
        const searchTerm = String(args.searchTerm || "").trim();
        if (!searchTerm) {
          throw new Error(t.searchUsersTermRequired);
        }
        const searchUsersRepository = require("@/modules/users/repositories/search-users.repository");
        const users = await searchUsersRepository.searchUsers(
          searchTerm,
          userId
        );
        return {
          name,
          result: {
            users: users.map((u) => ({
              avatar_url: u.avatar_url ? spacesService.getFileUrl(u.avatar_url) : null,
              email: u.email,
              id: u.user_id,
              name: u.name,
              username: u.username,
            })),
          },
          success: true,
        };
      }
      case "search_projects": {
        const searchTerm = String(args.searchTerm || "").trim();
        if (!searchTerm) {
          throw new Error(t.searchProjectsTermRequired);
        }

        const scope = organizationId
          ? { mode: "organization", organizationId }
          : { mode: "user", userId };

        const { rows } = await projectsReadRepository.getAllProjectsFiltered(
          scope,
          { search: searchTerm },
          { limit: 10, offset: 0 },
          { field: "created_at", order: "desc" },
          { collaborators: false, notes: false, subprojects: false },
          userId
        );

        return {
          name,
          result: {
            projects: rows.map((p) => ({
              id: p.id,
              public_id: p.public_project_id,
              title: p.title,
              status: p.status,
            })),
          },
          success: true,
        };
      }
      default: {
        const error = new Error(
          typeof t.functionNotSupported === "function"
            ? t.functionNotSupported(name)
            : t.functionNotSupported
        );
        error.code = "CHAT_FUNCTION_NOT_SUPPORTED";
        error.statusCode = 400;
        throw error;
      }
    }
  }

  /**
   * Executes all function calls from engine response.
   *
   * @param {string} userId - The ID of the authenticated user.
   * @param {Array<{name: string, arguments?: Record<string, unknown>}>} functionCalls - Array of tool execution details.
   * @param {string|null} [organizationId=null] - Optional organization ID scope for the calls.
   * @param {string} [lang="pt"] - User language for error translations.
   * @returns {Promise<Array<object>>} Results of all tool executions.
   */
  async executeFunctionCalls(
    userId,
    functionCalls = [],
    organizationId = null,
    lang = "pt"
  ) {
    const results = [];
    for (const functionCall of functionCalls) {
      try {
        const execution = await this.executeFunctionCall(
          userId,
          functionCall,
          organizationId,
          lang
        );
        results.push(execution);
      } catch (error) {
        console.warn(
          `[weave-ai/chat] Tool execution failed for ${functionCall?.name}:`,
          error?.message
        );
        results.push({
          name: functionCall?.name || "unknown",
          success: false,
          error: error?.message || String(error),
        });
      }
    }
    return results;
  }
}

module.exports = new ChatFunctionsService();
