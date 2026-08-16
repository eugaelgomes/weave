const notesCommentsRepository = require("../repositories/notes-comments.repository");
const spacesService = require("@/services/storage");
const {
  assertCommentFilesStorageScope,
  normalizeCommentCreatePayload,
  normalizeCommentUpdatePayload,
} = require("../normalizer");
const { NotesService } = require("./notes.service");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const notesRepository = require("@/modules/notes/notes.repository");

class NotesCommentsService {
  constructor() {
    this.commentsRepository = notesCommentsRepository;
  }

  async listComments(userId, noteId) {
    await NotesService._validateNoteAccess(noteId, userId);
    const comments = await this.commentsRepository.listByNoteId(noteId);
    return comments;
  }

  async createComment(userId, noteId, payload) {
    const { note } = await NotesService._validateNoteAccess(noteId, userId);

    let normalizedPayload;
    try {
      normalizedPayload = normalizeCommentCreatePayload(payload || {});
    } catch (e) {
      const err = new Error(e.message || "Invalid data");
      err.statusCode = 400;
      throw err;
    }

    if (normalizedPayload.parentId) {
      const parent = await this.commentsRepository.getById(normalizedPayload.parentId);
      if (!parent || parent.note_id !== noteId) {
        const err = new Error("Parent comment not found");
        err.statusCode = 404;
        throw err;
      }
    }

    if (normalizedPayload.files.length > 0) {
      assertCommentFilesStorageScope(normalizedPayload.files, userId, noteId);
    }

    const orgId = note.org_id || null;

    const created = await this.commentsRepository.create({
      content: normalizedPayload.content,
      files: normalizedPayload.files,
      noteId,
      orgId,
      parentId: normalizedPayload.parentId,
      userId,
    });

    try {
      const commenterData = await SearchUsersRepository.findById(userId);
      const collaborators = await notesRepository.getCollaboratorsByNoteId(noteId);
      const notifyUserIds = new Set();

      if (note.user_id && note.user_id !== userId) {
        notifyUserIds.add(note.user_id);
      }
      for (const c of collaborators) {
        if (c.user_id !== userId) notifyUserIds.add(c.user_id);
      }

      for (const notifyUserId of notifyUserIds) {
        await NotificationsRepository.createNotification({
          actorId: userId,
          content: {
            action: "comment_added",
            commenter_name: commenterData?.name,
            note_id: noteId,
            note_title: note.title,
          },
          entityId: noteId,
          entityType: "note",
          title: `New comment on ${note.title || "untitled"}`,
          type: "note_shared",
          userId: notifyUserId,
        });
      }
    } catch (err) {
      console.error("Failed to send comment notifications", err);
    }

    return created;
  }

  async updateComment(userId, noteId, commentId, payload) {
    await NotesService._validateNoteAccess(noteId, userId);

    const existing = await this.commentsRepository.getById(commentId);
    if (!existing || existing.note_id !== noteId) {
      const err = new Error("Comment not found");
      err.statusCode = 404;
      throw err;
    }

    const patch = normalizeCommentUpdatePayload(payload || {});
    if (patch.content === undefined && patch.files === undefined) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    if (patch.files !== undefined && patch.files.length > 0) {
      assertCommentFilesStorageScope(patch.files, userId, noteId);
    }

    const updated = await this.commentsRepository.update(commentId, userId, patch);
    if (!updated) {
      const err = new Error("Comment not found");
      err.statusCode = 404;
      throw err;
    }

    return updated;
  }

  async uploadCommentFiles(userId, noteId, uploads) {
    await NotesService._validateNoteAccess(noteId, userId);

    if (!uploads || !uploads.length) {
      const err = new Error("No files sent");
      err.statusCode = 400;
      throw err;
    }

    const files = await Promise.all(
      uploads.map(async (file) => {
        const result = await spacesService.uploadNoteCommentFile(
          file.buffer,
          file.mimetype,
          noteId,
          userId,
          file.originalname
        );
        return {
          id: result.fileName,
          name: file.originalname,
          path: result.key || "",
          type: file.mimetype,
        };
      })
    );

    return files;
  }

  async deleteComment(userId, noteId, commentId) {
    await NotesService._validateNoteAccess(noteId, userId);

    const existing = await this.commentsRepository.getById(commentId);
    if (!existing || existing.note_id !== noteId) {
      const err = new Error("Comment not found");
      err.statusCode = 404;
      throw err;
    }

    const ok = await this.commentsRepository.softDelete(commentId, userId);
    if (!ok) {
      const err = new Error("Comment not found");
      err.statusCode = 404;
      throw err;
    }

    return true;
  }
}

module.exports = {
  NotesCommentsService: new NotesCommentsService(),
};
