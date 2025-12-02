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

// Projects Services
export {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectCollaborators,
  manageCollaborator,
  fetchProjectNotes,
  manageProjectNote,
  type Project,
  type ProjectProperties,
  type ProjectOwner,
  type ProjectCollaborator,
  type ProjectNote,
  type ProjectsResponse,
  type CreateProjectData,
  type UpdateProjectData,
  type ManageCollaboratorData,
  type ManageNoteData,
} from "./projects-service/ProjectsService";

// Backup Services
export * from "./backup-service/BackupService";

// Health Services
export * from "./health-service/HealthService";

// API Client
export * from "./api-methods";
