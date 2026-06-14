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
const fs = require("fs");
const path = require("path");

/**
 * Singleton registry for AI tool handlers.
 * Dynamically loads all `.handler.js` files at startup to avoid manual imports.
 */
class ToolRegistry {
  constructor() {
    this.handlers = new Map();
    this._registerAll();
  }

  _registerAll() {
    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith(".handler.js"));
    for (const file of files) {
      const handler = require(path.join(__dirname, file));
      const name = file.replace(".handler.js", "").replace(/-/g, "_");
      this.handlers.set(name, handler);
    }
  }

  /**
   * Retrieves a handler instance by its snake_case function name.
   *
   * @param {string} name - The tool function name (e.g. "create_note").
   * @returns {Object|undefined} The handler instance or undefined.
   */
  getHandler(name) {
    return this.handlers.get(name);
  }
}

module.exports = new ToolRegistry();
