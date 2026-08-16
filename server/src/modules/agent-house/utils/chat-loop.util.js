const { v5: uuidv5 } = require("uuid");
const chatRepository = require("@/modules/agent-house/repositories/chat.repository");
const PlansService = require("@/modules/plans/services/plans.service");
const chatFormatterUtil = require("./chat-formatter.util");
const chatEngineService = require("./chat-engine.util");
const chatFunctionsService = require("./chat-functions.util");
const { getLocalChatI18n } = require("./agent-house-i18n.util");

class ChatLoopService {
  async executeReActLoop({
    userId,
    payload,
    organizationId,
    requestId,
    files,
    userLanguage,
    onChunk,
    contextData,
  }) {
    const {
      sessionId,
      selectedAgent,
      authorizedFunctions,
      capabilityRules,
      resourceAccess,
      conversationHistory,
      resolvedNoteIds,
      resolvedProjectIds,
      usageRecord,
    } = contextData;

    const chatI18n = getLocalChatI18n(userLanguage);
    let currentLoop = 0;
    const MAX_LOOPS = 5;

    let finalAssistantText = "";
    let responseFunctions = [];
    let functionExecution = [];
    let engineActions = [];
    let messageStatus = "ok";
    let providerUsed = null;
    const tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const messageMetadata = {
      citations: [],
      functionExecution: [],
      functions: [],
      providerUsed: null,
      requestId,
    };

    let currentMessage = payload.message;
    const currentConversationHistory = [...conversationHistory];
    let totalLatencyMs = 0;

    while (currentLoop < MAX_LOOPS) {
      const engineResponse = await chatEngineService.requestEngineChat(
        {
          agent: selectedAgent,
          allowEdit: payload.allowEdit,
          allowWebSearch: payload.allowWebSearch,
          availableAgents: payload.availableAgents,
          context: {
            capabilityRules,
            clientContext: payload.context,
            isSubAgent: Boolean(payload.isSubAgent),
            noteBlocksContract: chatFormatterUtil.buildNoteBlocksContract(),
            noteDocumentContract: chatFormatterUtil.buildNoteBlocksContract(),
            organizationId,
            resourceAccess,
            useCase: payload.useCase,
            userLanguage,
          },
          conversationHistory: currentConversationHistory,
          files: currentLoop === 0 ? chatFormatterUtil.buildEngineFilesPayload(files) : [],
          functions: authorizedFunctions,
          isSubAgent: payload.isSubAgent,
          message: currentMessage,
          model: chatFormatterUtil.resolveModelForEngine(payload.model),
          noteIds: resolvedNoteIds,
          organizationId,
          projectIds: resolvedProjectIds,
          sessionId,
          user_id: userId,
          userId,
          ...(organizationId ? { org_id: organizationId } : {}),
          userLanguage,
        },
        requestId,
        onChunk
      );

      totalLatencyMs += engineResponse?.latencyMs || 0;
      const enginePayload = engineResponse?.data || {};

      const engineExecutedActions = Array.isArray(enginePayload?.executedActions)
        ? enginePayload.executedActions
        : [];
      if (engineExecutedActions.length > 0) {
        engineActions = [...engineActions, ...engineExecutedActions];
      }

      const assistantText =
        enginePayload?.data?.response ||
        enginePayload?.data?.text ||
        enginePayload?.data?.content ||
        "";
      const currentFunctions = Array.isArray(enginePayload?.toolCalls)
        ? enginePayload.toolCalls
        : [];

      providerUsed = enginePayload?.providerUsed || providerUsed;
      const currentTokenUsage = chatFormatterUtil.extractTokenUsage(enginePayload);
      tokenUsage.inputTokens += currentTokenUsage.inputTokens || 0;
      tokenUsage.outputTokens += currentTokenUsage.outputTokens || 0;
      tokenUsage.totalTokens += currentTokenUsage.totalTokens || 0;

      if (Array.isArray(enginePayload?.data?.citations)) {
        messageMetadata.citations = [...messageMetadata.citations, ...enginePayload.data.citations];
      }

      if (currentFunctions.length > 0) {
        messageStatus = "function_call";
        const currentExecutions = await chatFunctionsService.executeFunctionCalls(
          userId,
          currentFunctions,
          organizationId,
          userLanguage,
          onChunk,
          files
        );
        functionExecution = [...functionExecution, ...currentExecutions];
        responseFunctions = [...responseFunctions, ...currentFunctions];

        if (assistantText) {
          finalAssistantText += (finalAssistantText ? "\n\n" : "") + assistantText;
        }

        await chatRepository.saveMessageIdempotent({
          agentId: payload.agentId,
          allowEdit: payload.allowEdit,
          content: assistantText || null,
          inputTokens: currentTokenUsage.inputTokens,
          latencyMs: engineResponse?.latencyMs || null,
          metadata: {
            citations: enginePayload?.data?.citations || [],
            providerUsed,
          },
          model: `${payload.model.name}:${payload.model.version}`,
          organizationId,
          outputTokens: currentTokenUsage.outputTokens,
          provider: providerUsed,
          requestId: uuidv5(`call_${currentLoop}`, requestId),
          role: "assistant",
          sessionId,
          status: "function_call",
          toolCalls: currentFunctions,
          totalTokens: currentTokenUsage.totalTokens,
          userId,
        });

        for (let i = 0; i < currentExecutions.length; i++) {
          const exec = currentExecutions[i];
          const fn = currentFunctions[i];
          const tId = fn.id || `call_${currentLoop}_${i}`;
          const execContent =
            typeof exec.result === "string"
              ? exec.result
              : JSON.stringify(exec.result || exec.error || exec);

          await chatRepository.saveMessageIdempotent({
            agentId: payload.agentId,
            allowEdit: payload.allowEdit,
            content: execContent,
            errorCode: exec.success ? null : "TOOL_EXECUTION_FAILED",
            errorMessage: exec.success ? null : String(exec.error),
            model: `${payload.model.name}:${payload.model.version}`,
            organizationId,
            provider: providerUsed,
            requestId: uuidv5(`tool_${currentLoop}_${i}`, requestId),
            role: "tool",
            sessionId,
            status: exec.success ? "ok" : "error",
            toolCallId: tId,
            userId,
          });
        }

        currentConversationHistory.push({
          content: currentMessage,
          role: "user",
        });
        currentConversationHistory.push({
          content: assistantText || chatI18n.callingFunctions,
          role: "assistant",
        });

        currentMessage = chatI18n.functionResults(JSON.stringify(currentExecutions, null, 2));
        currentLoop++;
      } else {
        if (assistantText) {
          finalAssistantText += (finalAssistantText ? "\n\n" : "") + assistantText;
        } else if (!finalAssistantText) {
          finalAssistantText =
            functionExecution.length > 0
              ? chatI18n.successFallback
              : responseFunctions.length > 0
                ? chatI18n.functionUnderstoodFallback
                : chatI18n.noContentFallback;
        }
        break;
      }
    }

    if (engineActions.length > 0) {
      messageMetadata.engineActions = engineActions;
      for (const action of engineActions) {
        functionExecution.push({
          name: action.name,
          result: action.result,
          source: "engine",
          success: !action.result?.error,
        });
      }
    }

    messageMetadata.functionExecution = functionExecution;
    messageMetadata.functions = responseFunctions;
    messageMetadata.providerUsed = providerUsed;

    await chatRepository.saveMessageIdempotent({
      agentId: payload.agentId,
      allowEdit: payload.allowEdit,
      content: finalAssistantText,
      inputTokens: tokenUsage.inputTokens,
      latencyMs: totalLatencyMs || null,
      metadata: messageMetadata,
      model: `${payload.model.name}:${payload.model.version}`,
      organizationId,
      outputTokens: tokenUsage.outputTokens,
      provider: providerUsed,
      requestId,
      role: "assistant",
      sessionId,
      status: messageStatus,
      totalTokens: tokenUsage.totalTokens,
      userId,
    });

    if (usageRecord?.id) {
      const filesCount = files?.length || 0;
      const reasoningLevel = payload.model?.reasoningLevel || "none";
      PlansService.consumeAiMessage(usageRecord.id, {
        filesCount,
        reasoningLevel,
        tokens: tokenUsage.totalTokens || 0,
      }).catch((err) => {
        console.error("[agent-house/chat] failed to enqueue AI usage consumption", {
          error: err?.message || String(err),
          usageId: usageRecord.id,
        });
      });
    }

    const sanitizedFunctionExecution = functionExecution.map((exec) => {
      let sanitizedResult = exec.result;
      if (sanitizedResult) {
        const jsonStr = JSON.stringify(sanitizedResult);
        if (jsonStr.length > 3000) {
          sanitizedResult = Array.isArray(sanitizedResult)
            ? [
                ...sanitizedResult.slice(0, 3),
                {
                  _warning: "Additional results truncated for UI performance.",
                },
              ]
            : {
                _warning: "Result payload too large, truncated for UI rendering.",
              };
        }
      }
      return { ...exec, result: sanitizedResult };
    });

    return {
      response: {
        citations: messageMetadata.citations,
        content: finalAssistantText,
        functionExecution: sanitizedFunctionExecution,
        functions: responseFunctions,
        metadata: {
          ...messageMetadata,
          functionExecution: sanitizedFunctionExecution,
        },
        model: payload.model,
        provider: providerUsed,
        role: "assistant",
      },
      sessionId,
    };
  }
}

module.exports = new ChatLoopService();
