/**
 * @module weave-engine/modules/core/tools/tool-dispatcher
 * @description Centralized registry and dispatcher for internal AI agent actions.
 * Maps function names to their concrete action implementations and schemas.
 *
 * Dependencies:
 * - `./actions/*`: The actual tool logic implementations.
 * - `./schemas/*`: The JSON schemas defining the tool parameters.
 */

const { logger } = require("../services/logger");

const { searchWeb, readUrl } = require("./web/web-browser.action");
const {
  schemas: webBrowserSchemas,
  zodSchemas: webBrowserZodSchemas,
} = require("./web/web-browser.schema");

const { searchMyNotes } = require("./web/search.action");
const {
  schemas: searchSchemas,
  zodSchemas: searchZodSchemas,
} = require("./web/search.schema");

const { getUserProfile } = require("./profile/profile.action");
const {
  schemas: profileSchemas,
  zodSchemas: profileZodSchemas,
} = require("./profile/profile.schema");

const {
  listMyProjects,
  getProjectDetails,
  createProject,
  updateProject,
  getProjectStages,
  createProjectStage,
  updateProjectStage,
  getProjectCollaborators,
  addProjectCollaborator,
  updateProjectCollaborator,
  removeProjectCollaborator,
} = require("./projects/project.action");
const {
  schemas: projectSchemas,
  zodSchemas: projectZodSchemas,
} = require("./projects/project.schema");

const {
  getOrganizationDetails,
} = require("./organization/organization.action");
const {
  schemas: organizationSchemas,
  zodSchemas: organizationZodSchemas,
} = require("./organization/organization.schema");

const { consultBrain } = require("./brain/brain.action");
const {
  schemas: brainSchemas,
  zodSchemas: brainZodSchemas,
} = require("./brain/brain.schema");

const {
  listOrgMembers,
  getOrgMember,
} = require("./organization/org-members.action");
const {
  schemas: orgMembersSchemas,
  zodSchemas: orgMembersZodSchemas,
} = require("./organization/org-members.schema");

const { listOrgAreas, getOrgArea } = require("./organization/org-areas.action");
const {
  schemas: orgAreasSchemas,
  zodSchemas: orgAreasZodSchemas,
} = require("./organization/org-areas.schema");

const {
  getNoteDetails,
  readNoteContent,
  listMyNotes,
  createCompleteNote,
  updateNote,
  createNoteBlock,
  updateNoteBlock,
  deleteNoteBlock,
  reorderNoteBlocks,
  getNoteCollaborators,
  addNoteCollaborator,
  createTaskInStage,
  updateTaskInProject,
} = require("./notes/note.action");
const {
  schemas: noteSchemas,
  zodSchemas: noteZodSchemas,
} = require("./notes/note.schema");

const {
  listNoteComments,
  createNoteComment,
  updateNoteComment,
  deleteNoteComment,
} = require("./notes/note-comments.action");
const {
  schemas: noteCommentsSchemas,
  zodSchemas: noteCommentsZodSchemas,
} = require("./notes/note-comments.schema");

const {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  assignTag,
  removeTag,
} = require("./tags/tag.action");
const { tagTools, tagSchemas } = require("./tags/tag.schema");

const {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} = require("./calendar/calendar.action");
const {
  calendarTools,
  calendarSchemas,
} = require("./calendar/calendar.schema");

const {
  getUnreadNotifications,
  markNotificationRead,
} = require("./notifications/notification.action");
const {
  notificationTools,
  notificationSchemas,
} = require("./notifications/notification.schema");

const {
  listTaskPriorities,
  createTaskPriority,
  updateTaskPriority,
  deleteTaskPriority,
} = require("./tasks/task-priority.action");
const {
  taskPriorityTools,
  taskPrioritySchemas,
} = require("./tasks/task-priority.schema");

const {
  get_active_sprint,
  get_project_sprints,
  create_sprint,
  complete_sprint,
} = require("./sprints/sprint.action");
const { sprintSchemas, sprintZodSchemas } = require("./sprints/sprint.schema");

const {
  create_artifact,
  update_artifact,
} = require("./artifacts/artifacts.action");
const {
  artifactSchemas,
  artifactZodSchemas,
} = require("./artifacts/artifacts.schema");

const {
  getSubscriptionStatus,
  getUsageHistory,
  getBackupSummary,
} = require("./workspace-admin/admin.action");
const {
  adminSchemas,
  adminZodSchemas,
} = require("./workspace-admin/admin.schema");

const {
  listWebhooks,
  getSlackStatus,
} = require("./integrations/integration.action");
const {
  integrationSchemas,
  integrationZodSchemas,
} = require("./integrations/integration.schema");
const INTERNAL_TOOLS = {
  add_note_collaborator: addNoteCollaborator,
  add_project_collaborator: addProjectCollaborator,
  assign_tag: assignTag,
  complete_sprint,

  consult_brain: consultBrain,

  // Artifacts
  create_artifact,

  create_calendar_event: createCalendarEvent,

  create_complete_note: createCompleteNote,

  create_note_block: createNoteBlock,

  create_note_comment: createNoteComment,

  create_project: createProject,

  create_project_stage: createProjectStage,

  create_sprint,

  create_tag: createTag,

  create_task_in_stage: createTaskInStage,

  create_task_priority: createTaskPriority,

  delete_calendar_event: deleteCalendarEvent,

  delete_note_block: deleteNoteBlock,

  delete_note_comment: deleteNoteComment,

  delete_tag: deleteTag,

  delete_task_priority: deleteTaskPriority,

  // Sprints
  get_active_sprint,

  get_backup_summary: getBackupSummary,

  get_note_collaborators: getNoteCollaborators,

  // Note header
  get_note_details: getNoteDetails,

  get_org_area: getOrgArea,

  get_org_member: getOrgMember,

  get_organization_details: getOrganizationDetails,

  get_project_collaborators: getProjectCollaborators,

  get_project_details: getProjectDetails,

  get_project_sprints,

  get_project_stages: getProjectStages,

  get_slack_status: getSlackStatus,

  // Admin
  get_subscription_status: getSubscriptionStatus,

  // Notifications
  get_unread_notifications: getUnreadNotifications,

  get_usage_history: getUsageHistory,

  get_user_profile: getUserProfile,

  // Calendar
  list_calendar_events: listCalendarEvents,

  list_my_notes: listMyNotes,

  list_my_projects: listMyProjects,

  // Note comments
  list_note_comments: listNoteComments,

  // Org areas
  list_org_areas: listOrgAreas,

  // Org members
  list_org_members: listOrgMembers,

  // Tags
  list_tags: listTags,

  // Task Priorities
  list_task_priorities: listTaskPriorities,

  // Integrations
  list_webhooks: listWebhooks,

  mark_notification_read: markNotificationRead,

  read_note_content: readNoteContent,

  read_url: readUrl,

  remove_project_collaborator: removeProjectCollaborator,

  remove_tag: removeTag,

  reorder_note_blocks: reorderNoteBlocks,

  search_my_notes: searchMyNotes,

  update_artifact,

  update_calendar_event: updateCalendarEvent,

  update_note: updateNote,

  update_note_block: updateNoteBlock,

  update_note_comment: updateNoteComment,

  update_project: updateProject,

  update_project_collaborator: updateProjectCollaborator,

  update_project_stage: updateProjectStage,

  update_tag: updateTag,

  update_task_in_project: updateTaskInProject,

  update_task_priority: updateTaskPriority,

  web_search: searchWeb,
};

const internalToolSchemas = [
  ...webBrowserSchemas,
  ...searchSchemas,
  ...profileSchemas,
  ...projectSchemas,
  ...organizationSchemas,
  ...brainSchemas,
  ...orgMembersSchemas,
  ...orgAreasSchemas,
  ...noteSchemas,
  ...noteCommentsSchemas,
  ...tagTools,
  ...calendarTools,
  ...notificationTools,
  ...taskPriorityTools,
  ...sprintSchemas,
  ...artifactSchemas,
  ...adminSchemas,
  ...integrationSchemas,
];

const ALL_ZOD_SCHEMAS = {
  ...webBrowserZodSchemas,
  ...searchZodSchemas,
  ...profileZodSchemas,
  ...projectZodSchemas,
  ...organizationZodSchemas,
  ...brainZodSchemas,
  ...orgMembersZodSchemas,
  ...orgAreasZodSchemas,
  ...noteZodSchemas,
  ...noteCommentsZodSchemas,
  ...tagSchemas,
  ...calendarSchemas,
  ...notificationSchemas,
  ...taskPrioritySchemas,
  ...sprintZodSchemas,
  ...artifactZodSchemas,
  ...adminZodSchemas,
  ...integrationZodSchemas,
};

/**
 * Evaluates whether a given tool name is registered as an internal execution target.
 *
 * @param {string} functionName - The name of the tool call requested by the LLM.
 * @returns {boolean} True if the tool is handled by the internal engine.
 */
function isInternalTool(functionName) {
  return functionName in INTERNAL_TOOLS;
}

/**
 * Dispatches an internal tool execution by routing the arguments to the correct action file.
 * Injects critical security context (userId, organizationId) dynamically.
 *
 * @param {string} functionName - The registered internal tool name.
 * @param {object} args - The parsed arguments provided by the LLM.
 * @param {object} [executionContext={}] - Request-scoped authentication context.
 * @returns {Promise<any>} The result of the action execution, or an error payload.
 */
async function executeInternalTool(functionName, args, executionContext = {}) {
  if (!isInternalTool(functionName)) {
    throw new Error(`Internal tool not found: ${functionName}`);
  }
  logger.info(`Executing internal tool: ${functionName}`, { args });
  try {
    let validatedArgs = args;
    const validator = ALL_ZOD_SCHEMAS[functionName];
    if (validator) {
      const parsed = validator.safeParse(args);
      if (!parsed.success) {
        logger.warn(`Invalid arguments for tool ${functionName}`, {
          issues: parsed.error.issues,
        });
        return {
          details: parsed.error.issues,
          error: `Invalid arguments for tool ${functionName}. Please fix them and try again.`,
        };
      }
      validatedArgs = parsed.data;
    }

    const enrichedArgs = { ...validatedArgs };

    // Inject server-side userId and organizationId for tools that need authenticated identity
    const TOOLS_NEEDING_CONTEXT = [
      "search_my_notes",
      "get_user_profile",
      "list_my_projects",
      "get_project_details",
      "get_organization_details",
      // Org members
      "list_org_members",
      "get_org_member",
      // Org areas
      "list_org_areas",
      "get_org_area",
      // Note
      "get_note_details",
      "read_note_content",
      "list_my_notes",
      // Note comments
      "list_note_comments",
      "create_note_comment",
      "update_note_comment",
      "delete_note_comment",
      // Tags
      "list_tags",
      "create_tag",
      "update_tag",
      "delete_tag",
      "assign_tag",
      "remove_tag",
      // Calendar
      "list_calendar_events",
      "create_calendar_event",
      "update_calendar_event",
      "delete_calendar_event",
      // Notifications
      "get_unread_notifications",
      "mark_notification_read",
      // Tasks / Priorities
      "list_task_priorities",
      "create_task_priority",
      "update_task_priority",
      "delete_task_priority",
      // Projects (new)
      "create_project",
      "update_project",
      "delete_project",
      // Sprints (new)
      "get_active_sprint",
      "get_project_sprints",
      "create_sprint",
      "complete_sprint",
      // Backups & Plans (new)
      "get_backup_summary",
      "get_backup_jobs",
      "request_backup",
      "get_subscription_status",
      "get_usage_history",
      // Note / Task mutations
      "create_complete_note",
      "update_note",
      "create_note_block",
      "update_note_block",
      "delete_note_block",
      "reorder_note_blocks",
      "get_note_collaborators",
      "add_note_collaborator",
      "create_task_in_stage",
      "update_task_in_project",
      // Artifacts (new)
      "create_artifact",
      "update_artifact",
      // Integrations (new)
      "list_webhooks",
      "get_slack_status",
    ];
    if (TOOLS_NEEDING_CONTEXT.includes(functionName)) {
      if (executionContext.userId)
        enrichedArgs.userId = executionContext.userId;
      if (executionContext.organizationId)
        enrichedArgs.organizationId = executionContext.organizationId;
    }

    const result = await INTERNAL_TOOLS[functionName](enrichedArgs);
    return result;
  } catch (error) {
    logger.error(`Internal tool ${functionName} failed`, {
      error: error.message,
    });
    return { error: error.message };
  }
}

/**
 * Retrieves the complete array of internal tool schemas to pass to the LLM.
 * Allows toggling specific capabilities like web search dynamically.
 *
 * @param {object} [executionContext={}] - Workspace context.
 * @returns {Array<object>} An array of OpenAI-compatible function schemas.
 */
function getInternalToolDefinitions(executionContext = {}) {
  let schemas = [...internalToolSchemas];

  if (!executionContext.organizationId) {
    const orgTools = [
      "get_organization_details",
      "list_org_members",
      "get_org_member",
      "list_org_areas",
      "get_org_area",
    ];
    schemas = schemas.filter((s) => !orgTools.includes(s.name));
  }

  return schemas;
}

module.exports = {
  executeInternalTool,
  getInternalToolDefinitions,
  isInternalTool,
};
