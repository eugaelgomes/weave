const express = require("express");

// Import utils and middlewares
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  resolveNotePublicIdParam,
} = require("@/middlewares/public-id-resolver");
const { validate } = require("@/middlewares/validation/validate");
const {
  commentFilesUpload,
  noteUpdateUpload,
} = require("./utils/note-upload.util");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
  notesBlockWriteLimiter,
} = require("@/middlewares/security/request-limiters");

const {
  noteIdParamSchema,
  blockIdParamSchema,
  commentIdParamSchema,
  collaboratorIdParamSchema,
  listNotesQuerySchema,
  createNoteSchema,
  createCompleteNoteSchema,
  updateNoteSchema,
  createNoteBlockSchema,
  updateNoteBlockSchema,
  reorderNoteBlocksSchema,
  putSyncNoteBlocksSchema,
  createCommentSchema,
  updateCommentSchema,
  addCollaboratorSchema,
} = require("./schemas/notes.schema");

// Import controllers
const NotesReadController = require("@/modules/notes/controllers/notes-read.controller");
const NotesWriteController = require("@/modules/notes/controllers/notes-write.controller");
const NotesCollaboratorsController = require("@/modules/notes/controllers/notes-collaborators.controller");
const NotesExportController = require("@/modules/notes/controllers/notes-export.controller");
const NotesCommentsController = require("@/modules/notes/controllers/notes-comments.controllers");
const NoteBlocksController = require("@/modules/notes/controllers/note-blocks.controller");

const router = express.Router();

router.param("id", resolveNotePublicIdParam);
router.param("noteId", resolveNotePublicIdParam);

// Feature toggle for block autosave v2
const blockAutosaveV2Enabled =
  String(
    process.env.ENABLE_NOTES_BLOCKS_AUTOSAVE_V2 || "true"
  ).toLowerCase() !== "false";
const blockWriteLimiter = blockAutosaveV2Enabled
  ? notesBlockWriteLimiter
  : standardTrafficLimiter;

router.use(verifyToken);

router.use((req, res, next) => {
  if (req.method === "GET") {
    return requireScope("notes:read")(req, res, next);
  }
  if (req.method === "DELETE") {
    return requireScope("notes:delete")(req, res, next);
  }
  return requireScope("notes:write")(req, res, next);
});

router.get(
  "/",
  highTrafficLimiter,
  validate(listNotesQuerySchema, "query"),
  (req, res, next) => {
    NotesReadController.getAllNotes(req, res, next);
  }
);

router.get("/stats", highTrafficLimiter, (req, res, next) => {
  NotesReadController.getNotesStats(req, res, next);
});

router.post(
  "/complete",
  standardTrafficLimiter,
  validate(createCompleteNoteSchema, "body"),
  (req, res, next) => {
    NotesWriteController.createCompleteNote(req, res, next);
  }
);

router.get(
  "/:noteId/export/pdf",
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesExportController.exportNoteAsPDF(req, res, next);
  }
);

router.get(
  "/:noteId/blocks",
  standardTrafficLimiter,
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NoteBlocksController.list(req, res, next);
  }
);

router.post(
  "/:noteId/blocks/reorder",
  blockWriteLimiter,
  validate(noteIdParamSchema, "params"),
  validate(reorderNoteBlocksSchema, "body"),
  (req, res, next) => {
    NoteBlocksController.reorder(req, res, next);
  }
);

router.put(
  "/:noteId/blocks",
  standardTrafficLimiter,
  validate(noteIdParamSchema, "params"),
  validate(putSyncNoteBlocksSchema, "body"),
  (req, res, next) => {
    NoteBlocksController.putSync(req, res, next);
  }
);

router.post(
  "/:noteId/blocks",
  blockWriteLimiter,
  validate(noteIdParamSchema, "params"),
  validate(createNoteBlockSchema, "body"),
  (req, res, next) => {
    NoteBlocksController.create(req, res, next);
  }
);

router.patch(
  "/:noteId/blocks/:blockId",
  blockWriteLimiter,
  validate(noteIdParamSchema, "params"),
  validate(blockIdParamSchema, "params"),
  validate(updateNoteBlockSchema, "body"),
  (req, res, next) => {
    NoteBlocksController.update(req, res, next);
  }
);

router.delete(
  "/:noteId/blocks/:blockId",
  blockWriteLimiter,
  validate(noteIdParamSchema, "params"),
  validate(blockIdParamSchema, "params"),
  (req, res, next) => {
    NoteBlocksController.softDelete(req, res, next);
  }
);

router.get("/:id", validate(noteIdParamSchema, "params"), (req, res, next) => {
  NotesReadController.getNoteById(req, res, next);
});

router.post(
  "/:id/document-images",
  standardTrafficLimiter,
  noteUpdateUpload.array("documentImages", 20),
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesWriteController.uploadDocumentImages(req, res, next);
  }
);

router.post("/", validate(createNoteSchema, "body"), (req, res, next) => {
  NotesWriteController.createNote(req, res, next);
});

router.put(
  "/:id",
  noteUpdateUpload.fields([
    { maxCount: 1, name: "icon" },
    { maxCount: 1, name: "banner" },
    { maxCount: 10, name: "files" },
    { maxCount: 20, name: "documentImages" },
  ]),
  validate(noteIdParamSchema, "params"),
  validate(updateNoteSchema, "body"),
  (req, res, next) => {
    NotesWriteController.updateNote(req, res, next);
  }
);

router.delete("/", (req, res, next) => {
  NotesWriteController.deleteNote(req, res, next);
});

router.delete(
  "/:id",
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesWriteController.deleteNote(req, res, next);
  }
);

router.get(
  "/:noteId/comments",
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesCommentsController.listComments(req, res, next);
  }
);

router.post(
  "/:noteId/comments",
  validate(noteIdParamSchema, "params"),
  validate(createCommentSchema, "body"),
  (req, res, next) => {
    NotesCommentsController.createComment(req, res, next);
  }
);

router.post(
  "/:noteId/comments/attachments",
  standardTrafficLimiter,
  commentFilesUpload.array("files", 10),
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesCommentsController.uploadCommentFiles(req, res, next);
  }
);

router.put(
  "/:noteId/comments/:commentId",
  validate(noteIdParamSchema, "params"),
  validate(commentIdParamSchema, "params"),
  validate(updateCommentSchema, "body"),
  (req, res, next) => {
    NotesCommentsController.updateComment(req, res, next);
  }
);

router.delete(
  "/:noteId/comments/:commentId",
  validate(noteIdParamSchema, "params"),
  validate(commentIdParamSchema, "params"),
  (req, res, next) => {
    NotesCommentsController.deleteComment(req, res, next);
  }
);

router.get(
  "/:noteId/collaborators",
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesCollaboratorsController.getCollaborators(req, res, next);
  }
);

router.post(
  "/:noteId/collaborators",
  validate(noteIdParamSchema, "params"),
  validate(addCollaboratorSchema, "body"),
  (req, res, next) => {
    NotesCollaboratorsController.addCollaborator(req, res, next);
  }
);

router.put(
  "/:noteId/recuseCollaboration",
  validate(noteIdParamSchema, "params"),
  (req, res, next) => {
    NotesCollaboratorsController.recuseCollaboration(req, res, next);
  }
);

router.delete(
  "/:noteId/collaborators/:collaboratorId",
  validate(noteIdParamSchema, "params"),
  validate(collaboratorIdParamSchema, "params"),
  (req, res, next) => {
    NotesCollaboratorsController.removeCollaborator(req, res, next);
  }
);

module.exports = router;
