// services/index.ts

// Authentication Services
export * from "./authentication/auth-service";
export * from "./authentication/use-auth-provider";

// API Tokens Service
export * from "./api-tokens-service/api-tokens.service";

// Notes Services
export {
  fetchNotes,
  fetchNoteById,
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  searchUsers,
  type Note,
  type NoteProperties,
  type Block,
  type FetchNotesParams,
  type NotesResponse,
  type CreateNoteData,
  type UpdateNoteData,
  type ShareNoteData,
  type User as NotesUser,
} from "./notes-service/notes-service";

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
} from "./projects-service/projects-service";

// Project Taxonomy Services (Tags and Task Priorities)
export {
  fetchProjectTags,
  createProjectTag,
  updateProjectTag,
  deleteProjectTag,
  fetchTaskPriorities,
  createTaskPriority,
  updateTaskPriority,
  deleteTaskPriority,
  type ProjectTag,
  type TaskPriority,
  type CreateProjectTagData,
  type UpdateProjectTagData,
  type CreateTaskPriorityData,
  type UpdateTaskPriorityData,
} from "./projects-service/project-taxonomy-service";

// Notifications Services
export {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  toggleNotificationTrash,
  deleteNotification,
  type Notification,
  type NotificationActor,
  type NotificationContent,
  type NotificationType,
  type NotificationEntityType,
  type NotificationStatusFilter,
  type NotificationsResponse,
  type FetchNotificationsParams,
  type PaginationMeta,
} from "./notifications/notifications-service";

// Organization Services
export {
  fetchOrganization,
  createOrganization,
  fetchOrganizationCreationStepOne,
  saveOrganizationCreationStepOne,
  completeOrganizationCreationStepOne,
  updateOrganization,
  updateOrganizationProperties,
  deleteOrganization,
  restoreOrganization,
  fetchOrganizationAreas,
  fetchAreaMembers,
  createOrganizationArea,
  getOrganizationArea,
  updateOrganizationArea,
  deleteOrganizationArea,
  addAreaMember,
  updateAreaMember,
  removeAreaMember,
  addMemberDirectly,
  inviteMember,
  removeMember,
  type Organization,
  type OrganizationProperties,
  type OrganizationMember,
  type OrganizationArea,
  type OrganizationAreaMember,
  type OrganizationAreaProperties,
  type OrganizationAreaMetrics,
  type OrganizationAreaMemberRole,
  type CreateOrganizationAreaInput,
  type UpdateOrganizationAreaInput,
  type AddAreaMemberInput,
  type UpdateAreaMemberInput,
  type CreateOrganizationData,
  type OrganizationBusinessRole,
  type OrganizationStepOneData,
  type OrganizationStepOneResponse,
  type UpdateOrganizationData,
  type InviteMemberData,
} from "./organization";

// Backup Services
export * from "./backup-service/backup-service";

// Health Services
export * from "./health-service/health-service";

// AI Services
export {
  fetchAvailableModels,
  sendChatMessage,
  fetchChatHistory,
  generateContent,
  analyzeNote,
  analyzeProject,
  research,
  fetchAgentProviders,
  type AIModel,
  type ChatMessage,
  type ChatSession,
  type SendMessageData,
  type GenerateContentData,
  type AgentProviderResponse,
} from "./ai-agent-service/agent-service";

// API Client and Endpoints
export {
  apiClient,
  ApiError,
  handleResponse,
  API_BASE_URL,
  API_CONFIG,
  API_ENDPOINTS,
} from "./api-methods";
