const express = require("express");

const notesController = require("@/modules/notes/notes.controller");

const { verifyToken } = require("@/middlewares/verify-token");
const { noteUpdateUpload } = require("@/utils/data/note-upload");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/request-limiters");

const router = express.Router();

router.use(verifyToken);

// Rotas de leitura (Leve)
router.get("/", highTrafficLimiter, (req, res, next) => {
  notesController.getAllNotes(req, res, next);
});

router.get("/stats", highTrafficLimiter, (req, res, next) => {
  notesController.getNotesStats(req, res, next);
});

// Operações de escrita/modificação (Médio)
router.post("/complete", standardTrafficLimiter, (req, res, next) => {
  notesController.createCompleteNote(req, res, next);
});

router.get("/:id", (req, res, next) => {
  notesController.getNoteById(req, res, next);
});

router.get("/:noteId/export/pdf", (req, res, next) => {
  notesController.exportNoteAsPDF(req, res, next);
});

router.post("/", (req, res, next) => {
  notesController.createNote(req, res, next);
});

router.put(
  "/:id",
  noteUpdateUpload.fields([
    { name: "icon", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  (req, res, next) => {
    notesController.updateNote(req, res, next);
  }
);

router.delete("/", (req, res, next) => {
  notesController.deleteNote(req, res, next);
});

router.get("/:noteId/blocks", (req, res, next) => {
  notesController.getBlocksByNote(req, res, next);
});

router.post("/:id/blocks", (req, res, next) => {
  notesController.createBlock(req, res, next);
});

router.put("/:noteId/blocks/reorder", (req, res, next) => {
  notesController.reorderBlocks(req, res, next);
});

router.put("/:noteId/blocks/:blockId", (req, res, next) => {
  notesController.updateBlock(req, res, next);
});

router.delete("/:noteId/blocks/:blockId", (req, res, next) => {
  notesController.deleteBlock(req, res, next);
});

router.get("/:noteId/collaborators", (req, res, next) => {
  notesController.getCollaborators(req, res, next);
});

router.post("/:noteId/collaborators", (req, res, next) => {
  notesController.addCollaborator(req, res, next);
});

router.put("/:noteId/recuseCollaboration", (req, res, next) => {
  notesController.recuseCollaboration(req, res, next);
});

router.delete("/:noteId/collaborators/:collaboratorId", (req, res, next) => {
  notesController.removeCollaborator(req, res, next);
});

module.exports = router;
