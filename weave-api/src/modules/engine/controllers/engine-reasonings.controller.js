const EngineReasoningsConfigController = require("./engine-reasonings.config.controller");
const EngineReasoningsReadController = require("./engine-reasonings.read.controller");
const EngineReasoningsWriteController = require("./engine-reasonings.write.controller");

module.exports = {
  createReasoning: EngineReasoningsWriteController.createReasoning.bind(
    EngineReasoningsWriteController
  ),
  getAiReportConfig: EngineReasoningsConfigController.getAiReportConfig.bind(
    EngineReasoningsConfigController
  ),
  getReasoningActionItems:
    EngineReasoningsReadController.getReasoningActionItems.bind(
      EngineReasoningsReadController
    ),
  getReasoningById: EngineReasoningsReadController.getReasoningById.bind(
    EngineReasoningsReadController
  ),
  getReasonings: EngineReasoningsReadController.getReasonings.bind(
    EngineReasoningsReadController
  ),
  triggerReasoningGeneration:
    EngineReasoningsWriteController.triggerReasoningGeneration.bind(
      EngineReasoningsWriteController
    ),
  updateAiReportConfig:
    EngineReasoningsConfigController.updateAiReportConfig.bind(
      EngineReasoningsConfigController
    ),
  updateReasoningActionItem:
    EngineReasoningsWriteController.updateReasoningActionItem.bind(
      EngineReasoningsWriteController
    ),
  updateReasoningInteraction:
    EngineReasoningsWriteController.updateReasoningInteraction.bind(
      EngineReasoningsWriteController
    ),
};
