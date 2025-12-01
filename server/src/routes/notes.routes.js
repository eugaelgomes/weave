const express = require("express");

const notesController = require("@/controllers/notes-manager/notes-controller");

const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

// --- AUTH MIDDLEWARE ---
router.use(verifyToken);

// --- ROUTES FOR NOTE MANAGEMENT ---

// GET /api/notes - Get all user's notes
router.get("/", (req, res, next) => {
  notesController.getAllNotes(req, res, next);
});

// GET /api/notes/stats - Stats geral de notas (DEVE VIR ANTES de /:id)
router.get("/stats", (req, res, next) => {
  notesController.getNotesStats(req, res, next);
});

// POST /api/notes/complete - Create a new complete note (with initial block)
router.post("/complete", (req, res, next) => {
  notesController.createCompleteNote(req, res, next);
});

// GET /api/notes/:id - Get a specific note by ID
router.get("/:id", (req, res, next) => {
  notesController.getNoteById(req, res, next);
});

// POST /api/notes - Create a new note
router.post("/", (req, res, next) => {
  notesController.createNote(req, res, next);
});

// PUT /api/notes/:id - Update an existing note
router.put("/:id", (req, res, next) => {
  notesController.updateNote(req, res, next);
});

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", (req, res, next) => {
  notesController.deleteNote(req, res, next);
});

// --- ROUTES FOR BLOCK MANAGEMENT ---

// GET /api/notes/:noteId/blocks - Get all blocks from a note
router.get("/:noteId/blocks", (req, res, next) => {
  notesController.getBlocksByNote(req, res, next);
});

// POST /api/notes/:id/blocks - Create a new block in the note
router.post("/:id/blocks", (req, res, next) => {
  notesController.createBlock(req, res, next);
});

// PUT /api/notes/:noteId/blocks/reorder - Reorder note blocks
router.put("/:noteId/blocks/reorder", (req, res, next) => {
  notesController.reorderBlocks(req, res, next);
});

// PUT /api/notes/:noteId/blocks/:blockId - Update a specific block
router.put("/:noteId/blocks/:blockId", (req, res, next) => {
  notesController.updateBlock(req, res, next);
});

// DELETE /api/notes/:noteId/blocks/:blockId - Delete a specific block
router.delete("/:noteId/blocks/:blockId", (req, res, next) => {
  notesController.deleteBlock(req, res, next);
});

// --- ROUTES FOR COLLABORATOR MANAGEMENT ---

// GET /api/notes/:noteId/collaborators - List collaborators of a note
router.get("/:noteId/collaborators", (req, res, next) => {
  notesController.getCollaborators(req, res, next);
});

// POST /api/notes/:noteId/collaborators - Add collaborator to note
router.post("/:noteId/collaborators", (req, res, next) => {
  notesController.addCollaborator(req, res, next);
});

// PUT /api/notes/:noteId/recuseCollaboration - Self-remove from note
router.put("/:noteId/recuseCollaboration", (req, res, next) => {
  notesController.recuseCollaboration(req, res, next);
});

// DELETE /api/notes/:noteId/collaborators/:collaboratorId - Remove collaborator from note
router.delete("/:noteId/collaborators/:collaboratorId", (req, res, next) => {
  notesController.removeCollaborator(req, res, next);
});

module.exports = router;
