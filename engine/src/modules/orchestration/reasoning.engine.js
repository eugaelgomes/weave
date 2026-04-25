const { buildSystemMessage } = require("../prompts/agent-prompts");
const { callAIProvider } = require("../providers/llm-provider.client");

const CONTENT_GENERATION_KEYWORDS =
  /\b(pesquise|escreva|crie conteúdo|detalhe|explique|resuma|elabore|riqueza|rico|histórico|sobre)\b/i;

/**
 * @param {object} params
 * @param {string} params.message
 * @param {string} params.useCase
 * @param {object} params.enrichedContext
 * @param {string} params.provider
 * @param {boolean} params.allowEdit
 * @returns {Promise<string|null>}
 */
async function processThinkingPhase({
  allowEdit,
  enrichedContext,
  message,
  provider,
  useCase,
}) {
  if (!allowEdit || !CONTENT_GENERATION_KEYWORDS.test(message)) {
    return null;
  }

  const generationSystemMessage =
    buildSystemMessage(useCase, enrichedContext) +
    "\n\nVOCÊ É UM PESQUISADOR E ESCRITOR EXPERT. Sua tarefa é APENAS gerar o conteúdo solicitado pelo usuário com máxima qualidade e riqueza de detalhes. NÃO tente editar notas agora. Apenas forneça o texto/conteúdo completo e bem formatado em Markdown.";

  try {
    const { data } = await callAIProvider({
      options: {
        allowEdit: false,
      },
      prompt: message,
      provider,
      systemMessage: generationSystemMessage,
      useCase,
    });
    return data.text || data.content || null;
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {string} params.originalMessage
 * @param {string|object} params.functionName
 * @param {object} params.executionResult
 * @param {string} params.provider
 * @param {string} params.systemMessage
 * @returns {Promise<string>}
 */
async function generateSmartResponse({
  executionResult,
  functionName,
  originalMessage,
  provider,
  systemMessage,
}) {
  const normalizedFunctionName =
    typeof functionName === "string" ? functionName : functionName?.name;

  const summaryPrompt = `
Contexto: O usuário solicitou "${originalMessage}".
Ação realizada: A função "${normalizedFunctionName}" foi executada com sucesso.
Resultado técnico (JSON): ${JSON.stringify(executionResult)}

Instrução:
1. Analise o resultado técnico.
2. Responda ao usuário confirmando a ação de forma natural, amigável e útil.
3. Se foi uma busca, resuma os resultados encontrados (liste os principais).
4. Se foi uma criação/edição, confirme os detalhes principais.
5. Use emojis para dar um tom agradável.
6. NÃO mostre o JSON técnico, apenas interprete-o.
7. Seja conciso.
`;

  try {
    const { data } = await callAIProvider({
      options: {
        allowEdit: false,
      },
      prompt: summaryPrompt,
      provider,
      systemMessage,
      useCase: "chat",
    });
    return data.text || data.content || data;
  } catch {
    return "✅ **Ação executada com sucesso!**\n\n(Detalhes técnicos ocultos para brevidade)";
  }
}

module.exports = {
  generateSmartResponse,
  processThinkingPhase,
};
