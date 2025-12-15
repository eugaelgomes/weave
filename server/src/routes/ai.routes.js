/**
 * AI Agent Routes
 * Rotas para integração com serviços de IA
 */

const express = require("express");
const aiController = require("@/controllers/ai-agent/ai-controller");
const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

// Aplica autenticação em todas as rotas
router.use(verifyToken);

/**
 * @route   POST /api/ai/generate
 * @desc    Gera conteúdo usando IA baseado em caso de uso
 * @access  Private
 * @body    {
 *   useCase: string,      // Caso de uso (note_generation, task_breakdown, etc)
 *   prompt: string,       // Prompt para a IA
 *   context?: object,     // Contexto adicional
 *   provider?: string     // Provider específico (gemini ou perplexity)
 * }
 */
router.post("/generate", (req, res, next) => {
  aiController.generateContent(req, res);
});

/**
 * @route   POST /api/ai/analyze-note
 * @desc    Analisa uma nota e fornece sugestões
 * @access  Private
 * @body    {
 *   noteId: string,           // ID da nota
 *   analysisType?: string     // Tipo: 'general', 'summarize', 'improve', 'tags'
 * }
 */
router.post("/analyze-note", (req, res, next) => {
  aiController.analyzeNote(req, res);
});

/**
 * @route   POST /api/ai/analyze-project
 * @desc    Analisa um projeto e fornece insights
 * @access  Private
 * @body    {
 *   projectId: string,        // ID do projeto
 *   analysisType?: string     // Tipo: 'general', 'progress', 'next_steps'
 * }
 */
router.post("/analyze-project", (req, res, next) => {
  aiController.analyzeProject(req, res);
});

/**
 * @route   POST /api/ai/research
 * @desc    Realiza pesquisa usando Perplexity
 * @access  Private
 * @body    {
 *   query: string,            // Query de pesquisa
 *   recencyFilter?: string    // Filtro: 'day', 'week', 'month', 'year'
 * }
 */
router.post("/research", (req, res, next) => {
  aiController.research(req, res);
});

/**
 * @route   GET /api/ai/use-cases
 * @desc    Lista todos os casos de uso disponíveis
 * @access  Private
 */
router.get("/use-cases", (req, res, next) => {
  aiController.listUseCases(req, res);
});

module.exports = router;
