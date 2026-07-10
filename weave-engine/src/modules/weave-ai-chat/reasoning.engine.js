/**
 * @module weave-engine/modules/weave-ai-chat/reasoning.engine
 * @description Facade exporting the primary AI reasoning engines.
 *
 * Dependencies:
 * - `./engines/react.engine.js`
 * - `./engines/thinking.engine.js`
 * - `./engines/smart-response.engine.js`
 */
const { executeAgenticTask } = require("./engines/react.engine");
const { processThinkingPhase } = require("./engines/thinking.engine");
const { generateSmartResponse } = require("./engines/smart-response.engine");

module.exports = {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
};
