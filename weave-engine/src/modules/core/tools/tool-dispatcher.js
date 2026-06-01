/**
 * Internal Tool Dispatcher for Weave Engine
 */

const { logger } = require("../../../logger");

const {
  searchWeb,
  readUrl,
  schemas: webBrowserSchemas,
} = require("./web-browser.tool");
const { searchMyNotes, schemas: searchSchemas } = require("./search.tool");
const { getUserProfile, schemas: profileSchemas } = require("./profile.tool");
const {
  listMyProjects,
  getProjectDetails,
  schemas: projectSchemas,
} = require("./project.tool");
const {
  getOrganizationDetails,
  schemas: organizationSchemas,
} = require("./organization.tool");
const { consultBrain, schemas: brainSchemas } = require("./brain.tool");
const {
  listOrgMembers,
  getOrgMember,
  schemas: orgMembersSchemas,
} = require("./org-members.tool");
const {
  listOrgAreas,
  getOrgArea,
  schemas: orgAreasSchemas,
} = require("./org-areas.tool");
const { getNoteDetails, schemas: noteSchemas } = require("./note.tool");
const {
  listNoteComments,
  createNoteComment,
  updateNoteComment,
  deleteNoteComment,
  schemas: noteCommentsSchemas,
} = require("./note-comments.tool");

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
