// services/index.ts

// Auth Services
export * from "./authentication/AuthService";
export * from "./authentication/UseAuthProvider";

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
  type NoteProperties,
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

// Organization Services
export {
  fetchOrganization,
  createOrganization,
  updateOrganization,
  updateOrganizationProperties,
  deleteOrganization,
  restoreOrganization,
  addMemberDirectly,
  inviteMember,
  removeMember,
  type Organization,
  type OrganizationProperties,
  type OrganizationMember,
  type CreateOrganizationData,
  type UpdateOrganizationData,
  type InviteMemberData,
} from "./organization";

// Backup Services
export * from "./backup-service/BackupService";

// Health Services
export * from "./health-service/HealthService";

// AI Services
export {
  fetchAvailableModels,
  sendChatMessage,
  fetchChatHistory,
  generateContent,
  analyzeNote,
  analyzeProject,
  research,
  type AIModel,
  type ChatMessage,
  type ChatSession,
  type SendMessageData,
  type GenerateContentData,
} from "./ai-agent-service/agent-servevice";

// API Client e Endpoints
export {
  apiClient,
  ApiError,
  handleResponse,
  API_BASE_URL,
  API_CONFIG,
  API_ENDPOINTS,
} from "./api-methods";
