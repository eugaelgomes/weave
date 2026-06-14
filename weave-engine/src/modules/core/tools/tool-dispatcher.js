/**
 * Internal Tool Dispatcher for Weave Engine
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
 * Checks if a function name is an internal tool.
 * @param {string} functionName
 * @returns {boolean}
 */
function isInternalTool(functionName) {
  return functionName in INTERNAL_TOOLS;
}

/**
 * Executes an internal tool.
 * @param {string} functionName
 * @param {object} args
 * @param {object} [executionContext] - Server-side context (userId, organizationId) injected securely
 * @returns {Promise<any>}
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
 * Gets definitions for all internal tools.
 * @returns {Array<object>}
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
