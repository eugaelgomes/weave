const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { resolveNotePublicIdParam } = require("@/middlewares/public-id-resolver");
const {
  commentFilesUpload,
  noteUpdateUpload,
} = require("@/utils/data/note-upload");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
  notesBlockWriteLimiter,
} = require("@/middlewares/security/request-limiters");

const NotesReadController = require("@/modules/notes/controllers/notes-read.controller");
const NotesWriteController = require("@/modules/notes/controllers/notes-write.controller");
const NotesCollaboratorsController = require("@/modules/notes/controllers/notes-collaborators.controller");
const NotesExportController = require("@/modules/notes/controllers/notes-export.controller");
const NotesCommentsController = require("@/modules/notes/controllers/notes-comments.controllers");
const NoteBlocksController = require("@/modules/notes/controllers/note-blocks.controller");

const router = express.Router();

router.param("id", resolveNotePublicIdParam);
router.param("noteId", resolveNotePublicIdParam);

const blockAutosaveV2Enabled =
  String(process.env.ENABLE_NOTES_BLOCKS_AUTOSAVE_V2 || "true").toLowerCase() !== "false";
const blockWriteLimiter = blockAutosaveV2Enabled
  ? notesBlockWriteLimiter
  : standardTrafficLimiter;

router.use(verifyToken);

router.get("/", highTrafficLimiter, (req, res, next) => {
  NotesReadController.getAllNotes(req, res, next);
});

router.get("/stats", highTrafficLimiter, (req, res, next) => {
  NotesReadController.getNotesStats(req, res, next);
});

router.post("/complete", standardTrafficLimiter, (req, res, next) => {
  NotesWriteController.createCompleteNote(req, res, next);
});

router.get("/:noteId/export/pdf", (req, res, next) => {
  NotesExportController.exportNoteAsPDF(req, res, next);
});

router.get("/:noteId/blocks", standardTrafficLimiter, (req, res, next) => {
  NoteBlocksController.list(req, res, next);
});

router.post("/:noteId/blocks/reorder", blockWriteLimiter, (req, res, next) => {
  NoteBlocksController.reorder(req, res, next);
});

router.put("/:noteId/blocks", standardTrafficLimiter, (req, res, next) => {
  NoteBlocksController.putSync(req, res, next);
});

router.post("/:noteId/blocks", blockWriteLimiter, (req, res, next) => {
  NoteBlocksController.create(req, res, next);
});

router.patch("/:noteId/blocks/:blockId", blockWriteLimiter, (req, res, next) => {
  NoteBlocksController.update(req, res, next);
});

router.delete("/:noteId/blocks/:blockId", blockWriteLimiter, (req, res, next) => {
  NoteBlocksController.softDelete(req, res, next);
});

router.get("/:id", (req, res, next) => {
  NotesReadController.getNoteById(req, res, next);
});

router.post(
  "/:id/document-images",
  standardTrafficLimiter,
  noteUpdateUpload.array("documentImages", 20),
  (req, res, next) => {
    NotesWriteController.uploadDocumentImages(req, res, next);
  }
);

router.post("/", (req, res, next) => {
  NotesWriteController.createNote(req, res, next);
});

router.put(
  "/:id",
  noteUpdateUpload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "files", maxCount: 10 },
    { name: "documentImages", maxCount: 20 },
  ]),
  (req, res, next) => {
    NotesWriteController.updateNote(req, res, next);
  }
);

router.delete("/", (req, res, next) => {
  NotesWriteController.deleteNote(req, res, next);
});

router.delete("/:id", (req, res, next) => {
  NotesWriteController.deleteNote(req, res, next);
});

router.get("/:noteId/comments", (req, res, next) => {
  NotesCommentsController.listComments(req, res, next);
});

router.post("/:noteId/comments", (req, res, next) => {
  NotesCommentsController.createComment(req, res, next);
});

router.post(
  "/:noteId/comments/attachments",
  standardTrafficLimiter,
  commentFilesUpload.array("files", 10),
  (req, res, next) => {
    NotesCommentsController.uploadCommentFiles(req, res, next);
  }
);

router.put("/:noteId/comments/:commentId", (req, res, next) => {
  NotesCommentsController.updateComment(req, res, next);
});

router.delete("/:noteId/comments/:commentId", (req, res, next) => {
  NotesCommentsController.deleteComment(req, res, next);
});

router.get("/:noteId/collaborators", (req, res, next) => {
  NotesCollaboratorsController.getCollaborators(req, res, next);
});

router.post("/:noteId/collaborators", (req, res, next) => {
  NotesCollaboratorsController.addCollaborator(req, res, next);
});

router.put("/:noteId/recuseCollaboration", (req, res, next) => {
  NotesCollaboratorsController.recuseCollaboration(req, res, next);
});

router.delete("/:noteId/collaborators/:collaboratorId", (req, res, next) => {
  NotesCollaboratorsController.removeCollaborator(req, res, next);
});

module.exports = router;
