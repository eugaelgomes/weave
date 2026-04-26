const redis = require("../../config/redis.client");
const {
  getEngineLlmRequestQueueRedisKey,
} = require("../../config/redis-queue-keys");
const { logger } = require("../../logger");
const {
  buildSystemMessage,
  getFewShotExamples,
} = require("../prompts/agent-prompts");
const {
  generateSmartResponse,
  processThinkingPhase,
} = require("../orchestration/reasoning.engine");
const { callAIProvider } = require("../providers/llm-provider.client");

const RESPONSE_TTL_SECONDS = 60;

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
      responsePayload = JSON.stringify({
        error: error.message,
        success: false,
      });
    }

    await redis.lpush(responseQueueKey, responsePayload);
    await redis.expire(responseQueueKey, RESPONSE_TTL_SECONDS);
  }

  /**
   * @param {string} taskType
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async executeTask(taskType, payload) {
    switch (taskType) {
      case "build_system_message":
        return {
          systemMessage: buildSystemMessage(payload.useCase, payload.additionalContext),
        };

      case "generate_smart_response":
        return {
          smartResponse: await generateSmartResponse(payload),
        };

      case "get_few_shot_examples":
        return {
          examples: getFewShotExamples(payload.useCase),
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
        const systemMessage = this.buildChatV2SystemMessage(payload);
        const { data, provider: providerUsed } = await callAIProvider({
          options: {
            allowEdit: Boolean(payload.allowEdit),
            functions: Array.isArray(payload.functions) ? payload.functions : [],
          },
          prompt: payload.message || "",
          provider: payload.model || payload.provider || "auto",
          systemMessage,
          useCase: payload.useCase || "chat",
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
   * @returns {string}
   */
  buildChatV2SystemMessage(payload = {}) {
    const noteIds = Array.isArray(payload.noteIds) ? payload.noteIds : [];
    const projectIds = Array.isArray(payload.projectIds) ? payload.projectIds : [];
    const files = Array.isArray(payload.files) ? payload.files : [];
    const baseMessage = buildSystemMessage(payload.useCase || "chat", {
      ...payload.context,
      projectIds,
      noteIds,
    });
    const agentInstructions = this.extractAgentInstructions(payload.agent);

    const fileSummary =
      files.length === 0
        ? "Nenhum arquivo anexado."
        : files
            .map(
              (file, index) =>
                `${index + 1}. ${file.name || "arquivo"} (${file.mimeType || "application/octet-stream"}, ${file.sizeBytes || 0} bytes)`
            )
            .join("\n");

    return `${baseMessage}

## Contexto recebido do Server (v2)
- userId: ${payload.userId || "unknown"}
- sessionId: ${payload.sessionId || "unknown"}
- noteIds: ${noteIds.length > 0 ? noteIds.join(", ") : "nenhum"}
- projectIds: ${projectIds.length > 0 ? projectIds.join(", ") : "nenhum"}
- allowEdit: ${payload.allowEdit ? "true" : "false"}

## Arquivos temporários
${fileSummary}

Responda ao usuário com clareza. Se precisar de ação no banco, retorne function call estruturada.${agentInstructions ? `\n\n## Agent selecionado\n${agentInstructions}` : ""}`;
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
    const objectives = Array.isArray(systemInstructions.objectives)
      ? systemInstructions.objectives.filter(Boolean).join(" | ")
      : "";
    const rules = Array.isArray(systemInstructions.rules)
      ? systemInstructions.rules.filter(Boolean).join(" | ")
      : "";

    const lines = [
      `agentId: ${agent.id || "unknown"}`,
      metadata.name ? `nome: ${metadata.name}` : "",
      persona.role ? `papel: ${persona.role}` : "",
      persona.tone ? `tom: ${persona.tone}` : "",
      persona.language ? `idioma: ${persona.language}` : "",
      contextText ? `instrucoes: ${contextText}` : "",
      objectives ? `objetivos: ${objectives}` : "",
      rules ? `regras: ${rules}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new LlmQueueProcessor();
