/**
 * @module weave-ai/handlers/delegate-to-agent.handler
 * @description Handler for the delegate_to_agent tool. Initiates a sub-session
 * using the agent delegation service.
 */
const agentDelegationService = require("../../services/agent-delegation.service");

class DelegateToAgentHandler {
  async execute({
    userId,
    args,
    organizationId,
    lang,
    name,
    toolCallId,
    files,
  }) {
    const { agentId, taskDescription } = args;

    if (!agentId || !taskDescription) {
      throw new Error(
        "Missing required arguments: agentId or taskDescription."
      );
    }

    const execution = await agentDelegationService.executeDelegateToAgent(
      userId,
      organizationId,
      lang,
      agentId,
      taskDescription,
      toolCallId,
      files
    );

    if (!execution.success) {
      throw new Error(execution.error);
    }

    return {
      name,
      result: execution.result,
      success: true,
    };
  }
}

module.exports = new DelegateToAgentHandler();
