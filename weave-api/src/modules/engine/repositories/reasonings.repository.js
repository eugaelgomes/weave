const ReasoningsActionItemsRepository = require("./reasonings.action-items.repository");
const ReasoningsCreateRepository = require("./reasonings.create.repository");
const ReasoningsInteractionsRepository = require("./reasonings.interactions.repository");
const ReasoningsReadRepository = require("./reasonings.read.repository");

module.exports = {
  create: ReasoningsCreateRepository.create.bind(ReasoningsCreateRepository),
  getActionItemsByReasoning:
    ReasoningsReadRepository.getActionItemsByReasoning.bind(
      ReasoningsReadRepository
    ),
  getByProjectSprint: ReasoningsReadRepository.getByProjectSprint.bind(
    ReasoningsReadRepository
  ),
  getContentById: ReasoningsReadRepository.getContentById.bind(
    ReasoningsReadRepository
  ),
  listByProjectForMember: ReasoningsReadRepository.listByProjectForMember.bind(
    ReasoningsReadRepository
  ),
  upsertInteraction: ReasoningsInteractionsRepository.upsertInteraction.bind(
    ReasoningsInteractionsRepository
  ),
  updateActionItem: ReasoningsActionItemsRepository.updateActionItem.bind(
    ReasoningsActionItemsRepository
  ),
};
