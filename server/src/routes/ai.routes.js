/**
 * AI Agent Routes
 * Rotas para integração com serviços de IA
 */

const express = require("express");
const aiController = require("@/controllers/weave-ai");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

// Aplica autenticação em todas as rotas
router.use(verifyToken);

/**
 * @route   POST /api/ai/chat
 * @desc    Chat unificado com IA - pode executar funções ou apenas responder
 * @access  Private
 * @body    {
 *   message: string,          // Mensagem do usuário
 *   allowEdit: boolean,       // Se true, permite executar funções (criar, editar, deletar)
 *                             // Se false, apenas responde sem executar ações
 *   useCase?: string,         // Caso de uso específico (opcional)
 *   provider?: string,        // Provider específico: 'gemini' ou 'perplexity' (opcional)
 *   sessionId?: string,       // ID da sessão de chat para manter histórico
 *   context?: object          // Contexto adicional (noteId, projectId, etc)
 * }
 */
router.post("/chat", (req, res, next) => {
  aiController.chat(req, res);
});

/**
 * @route   GET /api/ai/chat/history
 * @desc    Busca histórico de chat
 * @access  Private
 * @query   sessionId?: string
 */
router.get("/chat/history", (req, res, next) => {
  aiController.getChatHistory(req, res);
});

/**
 * @route   GET /api/ai/use-cases
 * @desc    Lista todos os casos de uso disponíveis
 * @access  Private
 */
router.get("/use-cases", (req, res, next) => {
  aiController.listUseCases(req, res);
});

/**
 * @route   GET /api/ai/models
 * @desc    Lista modelos de IA disponíveis
 * @access  Private
 */
router.get("/models", (req, res, next) => {
  aiController.getAvailableModels(req, res);
});

/**
 * @route   GET /api/ai/functions
 * @desc    Lista todas as funções que a IA pode executar (quando allowEdit=true)
 * @access  Private
 */
router.get("/functions", (req, res, next) => {
  aiController.listAvailableFunctions(req, res);
});

module.exports = router;
