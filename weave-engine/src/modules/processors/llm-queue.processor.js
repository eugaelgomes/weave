/* eslint-disable sort-keys */
const redis = require("../../services/redis.client");
const {
  getEngineLlmRequestQueueRedisKey,
} = require("../../services/redis-queue-keys");
const { logger } = require("../../logger");
const { buildSystemMessage } = require("../prompts/agent-prompts");
const { buildEntityContext } = require("../context/entity-context.loader");
const {
  generateSmartResponse,
  processThinkingPhase,
} = require("../orchestration/reasoning.engine");
const { callAIProvider } = require("../providers/llm-provider.client");

const RESPONSE_TTL_SECONDS = 60;

function resolveOrganizationId(payload = {}, context = {}) {
  return (
    payload.organizationId ||
    payload.organization_id ||
    payload.orgId ||
    payload.orgWideOrganizationId ||
    context.organizationId ||
    context.organization_id ||
    context.orgId ||
    context.orgWideOrganizationId ||
    null
  );
}

class LlmQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getEngineLlmRequestQueueRedisKey();
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Engine LLM processor started", { queueName: this.queueName });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);

        if (!result) {
          continue;
        }

        const [, payload] = result;
        await this.processJob(JSON.parse(payload));
      } catch (error) {
        logger.error("Engine LLM processor loop failed", {
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * @param {object} job
   * @param {object} [job.payload]
   * @param {string} job.responseQueueKey
   * @param {string} [job.taskType]
   * @returns {Promise<void>}
   */
  async processJob(job) {
    const { payload = {}, responseQueueKey, taskType = "provider_call" } = job;

    if (!responseQueueKey) {
      logger.warn("Engine LLM job discarded: missing response queue key");
      return;
    }

    let responsePayload;

    try {
      const data = await this.executeTask(taskType, payload);
      responsePayload = JSON.stringify({
        data,
        success: true,
      });
    } catch (error) {
      const normalizedError = this.normalizeTaskError(error, taskType);
      logger.error("Engine LLM task failed", {
        code: normalizedError.code,
        message: normalizedError.message,
        taskType,
      });
      responsePayload = JSON.stringify({
        error: normalizedError,
        success: false,
      });
    }

    await redis.lpush(responseQueueKey, responsePayload);
    await redis.expire(responseQueueKey, RESPONSE_TTL_SECONDS);
  }

  /**
   * @param {unknown} error
   * @param {string} taskType
   * @returns {{ code: string, message: string, taskType: string }}
   */
  normalizeTaskError(error, taskType) {
    return {
      code:
        typeof error?.code === "string" && error.code
          ? error.code
          : "ENGINE_TASK_FAILED",
      message:
        typeof error?.message === "string" && error.message
          ? error.message
          : "Engine task failed",
      taskType,
    };
  }

  /**
   * @param {string} taskType
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async executeTask(taskType, payload) {
    switch (taskType) {
      case "build_system_message":
        {
          const additionalContext = payload.additionalContext || {};
          const organizationId = resolveOrganizationId(payload, additionalContext);
          const entityContext = await buildEntityContext({
            noteIds: payload.noteIds || additionalContext.noteIds,
            projectIds: payload.projectIds || additionalContext.projectIds,
            userId: payload.userId || additionalContext.userId,
            organizationId,
          });

          return {
            systemMessage: buildSystemMessage({
              ...additionalContext,
              indexedNotes: entityContext.indexedNotes,
              indexedProjects: entityContext.indexedProjects,
              userLanguage: payload.userLanguage || additionalContext.userLanguage,
            }),
          };
        }

      case "generate_smart_response":
        return {
          smartResponse: await generateSmartResponse(payload),
        };

      case "get_few_shot_examples":
        return {
          examples: [],
        };

      case "process_thinking_phase":
        return {
          generatedContent: await processThinkingPhase(payload),
        };

      case "provider_call":
      default: {
        const { data, provider: providerUsed } = await callAIProvider(payload);
        return {
          ...data,
          providerUsed,
        };
      }

      case "chat_v2_process": {
        const systemMessage = await this.buildChatV2SystemMessage(payload);
        const { data, provider: providerUsed } = await callAIProvider({
          options: {
            allowEdit: Boolean(payload.allowEdit),
            functions: Array.isArray(payload.functions) ? payload.functions : [],
          },
          model: payload.model || null,
          prompt: payload.message || "",
          systemMessage,
        });

        const functions =
          data?.type === "function_call" && data?.functionCall
            ? [data.functionCall]
            : [];

        return {
          data: {
            citations: data?.citations || [],
            content: data?.content || null,
            response: data?.text || data?.content || null,
            text: data?.text || null,
          },
          functions,
          providerUsed,
        };
      }
    }
  }

  /**
   * Build chat-v2 system prompt using request metadata.
   *
   * @param {object} payload
   * @returns {Promise<string>}
   */
  async buildChatV2SystemMessage(payload = {}) {
    const noteIds = Array.isArray(payload.noteIds) ? payload.noteIds : [];
    const projectIds = Array.isArray(payload.projectIds) ? payload.projectIds : [];
    const files = Array.isArray(payload.files) ? payload.files : [];
    const organizationId = resolveOrganizationId(payload, payload.context || {});
    const entityContext = await buildEntityContext({
      noteIds,
      projectIds,
      userId: payload.userId,
      organizationId,
    });

    const baseMessage = buildSystemMessage({
      ...payload.context,
      projectIds,
      noteIds,
      indexedNotes: entityContext.indexedNotes,
      indexedProjects: entityContext.indexedProjects,
      userLanguage: payload.userLanguage || payload.context?.userLanguage,
    });
    const agentInstructions = this.extractAgentInstructions(payload.agent);
    const noteDocumentContract = payload?.context?.noteDocumentContract || null;

    const fileSummary =
      files.length === 0
        ? "No files attached."
        : files
            .map(
              (file, index) =>
                `${index + 1}. ${file.name || "file"} (${file.mimeType || "application/octet-stream"}, ${file.sizeBytes || 0} bytes)`
            )
            .join("\n");

    return `${baseMessage}

## Context received from Server (v2)
- userId: ${payload.userId || "unknown"}
- sessionId: ${payload.sessionId || "unknown"}
- noteIds: ${noteIds.length > 0 ? noteIds.join(", ") : "none"}
- projectIds: ${projectIds.length > 0 ? projectIds.join(", ") : "none"}
- organizationId: ${organizationId || "unknown"}
- userLanguage: ${payload.userLanguage || payload.context?.userLanguage || "unknown"}
- allowEdit: ${payload.allowEdit ? "true" : "false"}

## Temporary files
${fileSummary}

${noteDocumentContract ? `## Note document contract for update_note_content
- When updating note body, prefer returning "document" (full payload) or "blocks" (array) in function arguments.
- Allowed document node types: ${Array.isArray(noteDocumentContract.allowedNodeTypes) ? noteDocumentContract.allowedNodeTypes.join(", ") : "unknown"}
- Allowed mark types: ${Array.isArray(noteDocumentContract.allowedMarkTypes) ? noteDocumentContract.allowedMarkTypes.join(", ") : "unknown"}
- Avoid unsupported node/mark types outside this contract.
- Prefer structured output by intent:
  - sections/titles -> heading + paragraph
  - enumerations/checklists -> bulletList, orderedList, taskList/taskItem
  - emphasis/callout -> blockquote
  - snippets/technical commands -> codeBlock
  - plain prose only when user asks for short/simple text
- Never return empty content for update_note_content. Ensure at least one text node with meaningful text.

` : ""}Respond to the user clearly. If database action is needed, return a structured function call.${agentInstructions ? `\n\n## Selected agent\n${agentInstructions}` : ""}`;
  }

  /**
   * Extracts agent personality instructions for prompt composition.
   *
   * @param {object|null|undefined} agent
   * @returns {string}
   */
  extractAgentInstructions(agent) {
    if (!agent || typeof agent !== "object") {
      return "";
    }

    const personality = agent.personality || {};
    const persona = personality.persona || {};
    const metadata = personality.metadata || {};
    const behavior = personality.behavior || {};
    const systemInstructions = behavior.system_instructions || {};
    const contextText = systemInstructions.context || "";
    const rules = Array.isArray(systemInstructions.rules)
      ? systemInstructions.rules.filter(Boolean).join(" | ")
      : "";

    const lines = [
      `agentId: ${agent.id || "unknown"}`,
      metadata.name ? `name: ${metadata.name}` : "",
      persona.role ? `role: ${persona.role}` : "",
      persona.tone ? `tone: ${persona.tone}` : "",
      persona.language ? `language: ${persona.language}` : "",
      contextText ? `instructions: ${contextText}` : "",
      rules ? `rules: ${rules}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new LlmQueueProcessor();
