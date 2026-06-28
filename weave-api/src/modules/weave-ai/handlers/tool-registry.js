/**
 * @module weave-ai/handlers/tool-registry
 * @description Registry file dynamically loading and mapping tool names to their handler implementations.
 * Provides a single source of truth for dynamic tool dispatch.
 *
 * Dependencies:
 * - Handlers inside the same directory (`*.handler.js`).
 *
 * Used by:
 * - `weave-ai/services/chat-functions.service.js`: To route LLM function calls to the correct handler.
 */
const toolHandlers = {
  // Notes
  create_note: require("./notes/create"),
  delete_note: require("./notes/delete"),
  update_note_collaborator_add: require("./notes/update-collaborator-add"),
  update_note_collaborator_remove: require("./notes/update-collaborator-remove"),
  update_note_content: require("./notes/update-content"),
  update_note_due_date: require("./notes/update-due-date"),
  update_note_priority: require("./notes/update-priority"),
  update_note_stage: require("./notes/update-stage"),
  update_note_tags: require("./notes/update-tags"),
  update_note_title: require("./notes/update-title"),
  
  // Projects
  create_project: require("./projects/create"),
  delete_project: require("./projects/delete"),
  search_projects: require("./projects/search"),
  update_project_title: require("./projects/update-title"),

  // Users
  search_users: require("./users/search"),

  // Agents
  delegate_to_agent: require("./agents/delegate"),

  // Sandbox / Artifacts
  create_artifact: require("./artifacts/create"),
  update_artifact: require("./artifacts/update"),
};

/**
 * Singleton registry for AI tool handlers.
 * Explicitly maps tool names to their handler modules for better type inference and security.
 */
class ToolRegistry {
  /**
   * Retrieves a handler instance by its snake_case function name.
   *
   * @param {string} name - The tool function name (e.g. "create_note").
   * @returns {Object|undefined} The handler instance or undefined.
   */
  getHandler(name) {
    return toolHandlers[name];
  }
}

module.exports = new ToolRegistry();
