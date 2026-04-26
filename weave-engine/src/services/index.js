const llmQueueProcessor = require("../modules/processors/llm-queue.processor");

/**
 * Starts internal engine services.
 */
async function initializeServices() {
  llmQueueProcessor.start();
}

module.exports = {
  initializeServices,
  llmQueueProcessor,
};
