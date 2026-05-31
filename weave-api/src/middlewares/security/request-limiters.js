const rateLimit = require("express-rate-limit");

/**
 * operações de fluxo muito alto: Leitura de dados (GET)
 * Listagem de notas, projetos, notificações
 * 3000 requisições a cada 15 minutos
 */
const highTrafficLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many read requests. Please try again later." },
});

/**
 * Perações de fluxo alto/comum
 * Criar/Editar notas e tarefas
 * 1000 requisições a cada 15 minutos
 */
const standardTrafficLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const notesBlockWriteWindowMs = Number(
  process.env.NOTES_BLOCKS_WRITE_WINDOW_MS || 5 * 60 * 1000
);
const notesBlockWriteMax = Number(process.env.NOTES_BLOCKS_WRITE_MAX || 3000);

const notesBlockWriteLimiter = rateLimit({
  windowMs: Number.isFinite(notesBlockWriteWindowMs)
    ? notesBlockWriteWindowMs
    : 5 * 60 * 1000,
  max: Number.isFinite(notesBlockWriteMax) ? notesBlockWriteMax : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: "Too many block edit requests. Please try again later." },
  handler: (req, res) => {
    console.warn("[notes.blocks.rate_limit]", {
      ip: req.ip,
      method: req.method,
      noteId: req.params?.noteId,
      path: req.originalUrl,
      userId: req.user?.userId || null,
    });
    res
      .status(429)
      .json({ error: "Too many block edit requests. Please try again later." });
  },
});

/**
 * Operações Estruturais: Criar Organização, Alterar Planos, Configurações de Perfil
 * 300 requisições a cada 30 minutos
 */
const structuralLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/**
 * Rotas de IA e Operações de Backup/Upload Pesados
 * Weave-IA, Backups, Uploads Grandes
 * 1500 requisições a cada 10 minutos
 */
const heavyOperationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/**
 * Autenticação e Recuperação de Senha
 * 50 tentativas falhas a cada 15 minutos
 */
const authSecurityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many failed attempts. Please try again later." },
});

module.exports = {
  highTrafficLimiter,
  standardTrafficLimiter,
  structuralLimiter,
  heavyOperationLimiter,
  authSecurityLimiter,
  notesBlockWriteLimiter,
  apiLimiter: highTrafficLimiter,
  strictLimiter: heavyOperationLimiter,
  authLimiter: authSecurityLimiter,
};
