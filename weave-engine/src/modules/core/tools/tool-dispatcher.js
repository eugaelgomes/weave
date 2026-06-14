/**
 * @module weave-engine/modules/core/tools/tool-dispatcher
 * @description Centralized registry and dispatcher for internal AI agent actions.
 * Maps function names to their concrete action implementations and schemas.
 *
 * Dependencies:
 * - `./actions/*`: The actual tool logic implementations.
 * - `./schemas/*`: The JSON schemas defining the tool parameters.
 */

const { logger } = require("../../../logger");

const { searchWeb, readUrl } = require("./actions/web-browser.action");
const { schemas: webBrowserSchemas } = require("./schemas/web-browser.schema");

const { searchMyNotes } = require("./actions/search.action");
const { schemas: searchSchemas } = require("./schemas/search.schema");

const { getUserProfile } = require("./actions/profile.action");
const { schemas: profileSchemas } = require("./schemas/profile.schema");

const {
  listMyProjects,
  getProjectDetails,
} = require("./actions/project.action");
const { schemas: projectSchemas } = require("./schemas/project.schema");

const { getOrganizationDetails } = require("./actions/organization.action");
const {
  schemas: organizationSchemas,
} = require("./schemas/organization.schema");

const { consultBrain } = require("./actions/brain.action");
const { schemas: brainSchemas } = require("./schemas/brain.schema");

const {
  listOrgMembers,
  getOrgMember,
} = require("./actions/org-members.action");
const { schemas: orgMembersSchemas } = require("./schemas/org-members.schema");

const { schemas: orgAreasSchemas } = require("./schemas/org-areas.schema");
const { listOrgAreas, getOrgArea } = require("./actions/org-areas.action");

const { getNoteDetails } = require("./actions/note.action");
const { schemas: noteSchemas } = require("./schemas/note.schema");

const {
  listNoteComments,
  createNoteComment,
  updateNoteComment,
  deleteNoteComment,
} = require("./actions/note-comments.action");
const {
  schemas: noteCommentsSchemas,
} = require("./schemas/note-comments.schema");

const INTERNAL_TOOLS = {
  web_search: searchWeb,
  read_url: readUrl,
  search_my_notes: searchMyNotes,
  get_user_profile: getUserProfile,
  list_my_projects: listMyProjects,
  get_project_details: getProjectDetails,
  get_organization_details: getOrganizationDetails,
  consult_brain: consultBrain,
  // Org members
  list_org_members: listOrgMembers,
  get_org_member: getOrgMember,
  // Org areas
  list_org_areas: listOrgAreas,
  get_org_area: getOrgArea,
  // Note header
  get_note_details: getNoteDetails,
  // Note comments
  list_note_comments: listNoteComments,
  create_note_comment: createNoteComment,
  update_note_comment: updateNoteComment,
  delete_note_comment: deleteNoteComment,
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
];

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
    const enrichedArgs = { ...args };

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
      // Note comments
      "list_note_comments",
      "create_note_comment",
      "update_note_comment",
      "delete_note_comment",
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
 * @param {boolean} [allowWebSearch=true] - Whether to include web search capabilities.
 * @returns {Array<object>} An array of OpenAI-compatible function schemas.
 */
function getInternalToolDefinitions(allowWebSearch = true) {
  if (allowWebSearch) {
    return internalToolSchemas;
  }
  return [
    ...searchSchemas,
    ...profileSchemas,
    ...projectSchemas,
    ...organizationSchemas,
    ...brainSchemas,
    ...orgMembersSchemas,
    ...orgAreasSchemas,
    ...noteSchemas,
    ...noteCommentsSchemas,
  ];
}

module.exports = {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
};
