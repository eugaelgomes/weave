/**
 * @module weave-engine/modules/weave-ai-chat/reasoning.engine
 * @description Facade exporting the primary AI reasoning engines.
 *
 * Dependencies:
 * - `./engines/react.engine.js`
 * - `./engines/thinking.engine.js`
 * - `./engines/smart-response.engine.js`
 */
const { executeAgenticTask } = require("./react.engine");
const { processThinkingPhase } = require("./thinking.engine");
const { generateSmartResponse } = require("./smart-response.engine");

module.exports = {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
};
