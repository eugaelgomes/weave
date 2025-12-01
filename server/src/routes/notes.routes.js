const express = require("express");

const notesController = require("@/controllers/notes-manager/notes-controller");

const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", (req, res, next) => {
  notesController.getAllNotes(req, res, next);
});

router.get("/stats", (req, res, next) => {
  notesController.getNotesStats(req, res, next);
});

router.post("/complete", (req, res, next) => {
  notesController.createCompleteNote(req, res, next);
});

router.get("/:id", (req, res, next) => {
  notesController.getNoteById(req, res, next);
});

router.post("/", (req, res, next) => {
  notesController.createNote(req, res, next);
});

router.put("/:id", (req, res, next) => {
  notesController.updateNote(req, res, next);
});

router.delete("/:id", (req, res, next) => {
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
