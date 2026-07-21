/**
 * @module weave-engine/modules/weave-ai-chat/reasoning.engine
 * @description Facade exporting the primary AI reasoning engines.
 *
 * Dependencies:
 * - `./engines/react.engine.js`
 * - `./engines/thinking.engine.js`
 * - `./engines/smart-response.engine.js`
 */
export { executeAgenticTask } from "./react.engine";
export { processThinkingPhase } from "./thinking.engine";
export { generateSmartResponse } from "./smart-response.engine";
