/**
 * Reasoning Engine
 * Motor de raciocínio para o agente de IA
 * Responsável por:
 * 1. Analisar a intenção do usuário (Thinking Phase)
 * 2. Gerar conteúdo prévio quando necessário
 * 3. Interpretar resultados de execução (Smart Response)
 */

const { callAIProvider } = require("@/services/weave-ai/ai-service");
const {
  buildSystemMessage,
} = require("@/services/weave-ai/config/agent-prompts");

/**
 * Palavras-chave que indicam necessidade de geração de conteúdo
 */
const CONTENT_GENERATION_KEYWORDS =
  /\b(pesquise|escreva|crie conteúdo|detalhe|explique|resuma|elabore|riqueza|rico|histórico|sobre)\b/i;

class ReasoningEngine {
  /**
   * Processa a fase de pensamento (Thinking Phase)
   * Decide se precisa gerar conteúdo antes de executar ações
   */
  async processThinkingPhase(
    message,
    useCase,
    enrichedContext,
    provider,
    allowEdit
  ) {
    // Se não permite edição, não há separação de fases (tudo é resposta direta)
    if (!allowEdit) {
      return null;
    }

    // Verifica se a mensagem pede geração de conteúdo complexo
    const needsContentGeneration = CONTENT_GENERATION_KEYWORDS.test(message);

    if (!needsContentGeneration) {
      return null;
    }

    console.log(
      "ReasoningEngine: Detectada necessidade de geração de conteúdo prévia..."
    );

    // Constrói prompt específico para geração
    const generationSystemMessage =
      buildSystemMessage(useCase, enrichedContext) +
      "\n\nVOCÊ É UM PESQUISADOR E ESCRITOR EXPERT. Sua tarefa é APENAS gerar o conteúdo solicitado pelo usuário com máxima qualidade e riqueza de detalhes. NÃO tente editar notas agora. Apenas forneça o texto/conteúdo completo e bem formatado em Markdown.";

    try {
      // Chama IA sem ferramentas para focar no texto
      const generationResponse = await callAIProvider(
        provider,
        message,
        generationSystemMessage,
        {
          allowEdit: false,
        }
      );

      const generatedContent =
        generationResponse.text || generationResponse.content;
      console.log(
        "ReasoningEngine: Conteúdo gerado com sucesso (tamanho):",
        generatedContent?.length
      );

      return generatedContent;
    } catch (genError) {
      console.warn(
        "ReasoningEngine: Erro na geração de conteúdo prévia:",
        genError
      );
      return null;
    }
  }

  /**
   * Gera uma resposta inteligente (Smart Response) após execução de ação
   */
  async generateSmartResponse(
    originalMessage,
    functionName,
    executionResult,
    provider,
    systemMessage
  ) {
    const summaryPrompt = `
Contexto: O usuário solicitou "${originalMessage}".
Ação realizada: A função "${functionName}" foi executada com sucesso.
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
      // Chama a IA novamente para gerar o resumo (sem tools para forçar texto)
      const summaryResponse = await callAIProvider(
        provider,
        summaryPrompt,
        systemMessage,
        {
          allowEdit: false,
        }
      );

      return summaryResponse.text || summaryResponse.content || summaryResponse;
    } catch (summaryError) {
      console.warn(
        "ReasoningEngine: Erro ao gerar resumo inteligente:",
        summaryError
      );
      // Fallback para resposta simples
      return `✅ **Ação executada com sucesso!**\n\n(Detalhes técnicos ocultos para brevidade)`;
    }
  }
}

module.exports = new ReasoningEngine();
