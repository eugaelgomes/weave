/**
 * Internal Tool Dispatcher for Weave Engine
 */

const { logger } = require("../../logger");

const { searchWeb, readUrl, schemas: webBrowserSchemas } = require("./web-browser.tool");
const { searchMyNotes, schemas: searchSchemas } = require("./search.tool");

const INTERNAL_TOOLS = {
  web_search: searchWeb,
  read_url: readUrl,
  search_my_notes: searchMyNotes,
};

const internalToolSchemas = [
  ...webBrowserSchemas,
  ...searchSchemas,
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
 * @returns {Promise<any>}
 */
async function executeInternalTool(functionName, args) {
  if (!isInternalTool(functionName)) {
    throw new Error(`Internal tool not found: ${functionName}`);
  }
  logger.info(`Executing internal tool: ${functionName}`, { args });
  try {
    const result = await INTERNAL_TOOLS[functionName](args);
    return result;
  } catch (error) {
    logger.error(`Internal tool ${functionName} failed`, { error: error.message });
    return { error: error.message };
  }
}

/**
 * Gets definitions for all internal tools.
 * @returns {Array<object>}
 */
function getInternalToolDefinitions() {
  return internalToolSchemas;
}

module.exports = {
  isInternalTool,
  executeInternalTool,
  getInternalToolDefinitions,
};
