const { executeAgenticTask } = require("./engines/react.engine");
const { processThinkingPhase } = require("./engines/thinking.engine");
const { generateSmartResponse } = require("./engines/smart-response.engine");

module.exports = {
  executeAgenticTask,
  generateSmartResponse,
  processThinkingPhase,
};
