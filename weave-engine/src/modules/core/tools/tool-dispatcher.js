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
const {
  schemas: webBrowserSchemas,
  zodSchemas: webBrowserZodSchemas,
} = require("./schemas/web-browser.schema");

const { searchMyNotes } = require("./actions/search.action");
const {
  schemas: searchSchemas,
  zodSchemas: searchZodSchemas,
} = require("./schemas/search.schema");

const { getUserProfile } = require("./actions/profile.action");
const {
  schemas: profileSchemas,
  zodSchemas: profileZodSchemas,
} = require("./schemas/profile.schema");

const {
  listMyProjects,
  getProjectDetails,
} = require("./actions/project.action");
const {
  schemas: projectSchemas,
  zodSchemas: projectZodSchemas,
} = require("./schemas/project.schema");

const { getOrganizationDetails } = require("./actions/organization.action");
const {
  schemas: organizationSchemas,
  zodSchemas: organizationZodSchemas,
} = require("./schemas/organization.schema");

const { consultBrain } = require("./actions/brain.action");
const {
  schemas: brainSchemas,
  zodSchemas: brainZodSchemas,
} = require("./schemas/brain.schema");

const {
  listOrgMembers,
  getOrgMember,
} = require("./actions/org-members.action");
const {
  schemas: orgMembersSchemas,
  zodSchemas: orgMembersZodSchemas,
} = require("./schemas/org-members.schema");

const { listOrgAreas, getOrgArea } = require("./actions/org-areas.action");
const {
  schemas: orgAreasSchemas,
  zodSchemas: orgAreasZodSchemas,
} = require("./schemas/org-areas.schema");

const { getNoteDetails } = require("./actions/note.action");
const {
  schemas: noteSchemas,
  zodSchemas: noteZodSchemas,
} = require("./schemas/note.schema");

const {
  listNoteComments,
  createNoteComment,
  updateNoteComment,
  deleteNoteComment,
} = require("./actions/note-comments.action");
const {
  schemas: noteCommentsSchemas,
  zodSchemas: noteCommentsZodSchemas,
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
          error: `Invalid arguments for tool ${functionName}. Please fix them and try again.`,
          details: parsed.error.issues,
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
 * @param {object} [executionContext={}] - Workspace context.
 * @returns {Array<object>} An array of OpenAI-compatible function schemas.
 */
function getInternalToolDefinitions(
  allowWebSearch = true,
  executionContext = {}
) {
  let schemas = allowWebSearch
    ? internalToolSchemas
    : [
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
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
};
