// services/index.ts

// Auth Services
export * from "./auth-service/AuthService";
export * from "./auth-service/UseAuthProvider";

// Notes Services
export {
  fetchNotes,
  fetchNoteById,
  createNote,
  updateNote,
  deleteNote,
  fetchBlocks,
  createBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  shareNote,
  searchUsers,
  type Note,
  type Block,
  type FetchNotesParams,
  type NotesResponse,
  type CreateNoteData,
  type UpdateNoteData,
  type CreateBlockData,
  type ShareNoteData,
  type User as NotesUser,
} from "./notes-service/NotesService";

// Backup Services
export * from "./backup-service/BackupService";

// Health Services
export * from "./health-service/HealthService";

// API Client
export * from "./api-methods";
