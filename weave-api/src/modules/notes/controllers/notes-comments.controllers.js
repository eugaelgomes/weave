const NotesBaseController = require("./base.controller");
const notesCommentsRepository = require("../repositories/notes-comments.repository");
const spacesService = require("@/services/storage");
const {
  assertCommentFilesStorageScope,
  normalizeCommentCreatePayload,
  normalizeCommentUpdatePayload,
} = require("../normalizer");

/**
 * Comments on notes (`notes_comments`).
 */
class NotesCommentsController extends NotesBaseController {
  constructor() {
    super();
    this.commentsRepository = notesCommentsRepository;
  }

  /**
   * GET /api/notes/:noteId/comments
   */
  async listComments(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const comments = await this.commentsRepository.listByNoteId(noteId);
      res.status(200).json(comments);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:noteId/comments
   */
  async createComment(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { note } = await this._validateNoteAccess(noteId, userId);

      let payload;
      try {
        payload = normalizeCommentCreatePayload(req.body || {});
      } catch (e) {
        throw new Error(e.message || "Invalid data");
      }

      if (payload.parentId) {
        const parent = await this.commentsRepository.getById(payload.parentId);
        if (!parent || parent.note_id !== noteId) {
          throw new Error("Parent comment not found");
        }
      }

      if (payload.files.length > 0) {
        assertCommentFilesStorageScope(payload.files, userId, noteId);
      }

      const orgId = note.org_id || null;

      const created = await this.commentsRepository.create({
        content: payload.content,
        files: payload.files,
        noteId,
        orgId,
        parentId: payload.parentId,
        userId,
      });

      res.status(201).json(created);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/comments/:commentId
   */
  async updateComment(req, res, next) {
    try {
      const { noteId, commentId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const existing = await this.commentsRepository.getById(commentId);
      if (!existing || existing.note_id !== noteId) {
        throw new Error("Comment not found");
      }

      const patch = normalizeCommentUpdatePayload(req.body || {});
      if (patch.content === undefined && patch.files === undefined) {
        throw new Error("No fields to update");
      }

      if (patch.files !== undefined && patch.files.length > 0) {
        assertCommentFilesStorageScope(patch.files, userId, noteId);
      }

      const updated = await this.commentsRepository.update(
        commentId,
        userId,
        patch
      );
      if (!updated) {
        throw new Error("Comment not found");
      }

      res.status(200).json(updated);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:noteId/comments/attachments — uploads files to `notes-comments-files/…`
   */
  async uploadCommentFiles(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const uploads = req.files || [];
      if (!uploads.length) {
        throw new Error("No files sent");
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

      res.status(201).json({ files });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/comments/:commentId
   */
  async deleteComment(req, res, next) {
    try {
      const { noteId, commentId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const existing = await this.commentsRepository.getById(commentId);
      if (!existing || existing.note_id !== noteId) {
        throw new Error("Comment not found");
      }

      const ok = await this.commentsRepository.softDelete(commentId, userId);
      if (!ok) {
        throw new Error("Comment not found");
      }

      res.status(200).json({ message: "Comment removed successfully" });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesCommentsController();
