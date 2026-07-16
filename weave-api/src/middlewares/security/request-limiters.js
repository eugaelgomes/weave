const rateLimit = require("express-rate-limit");

/**
 * operações de fluxo muito alto: Leitura de dados (GET)
 * Listagem de notas, projetos, notificações
 * 3000 requisições a cada 15 minutos
 */
const highTrafficLimiter = rateLimit({
  legacyHeaders: false,
  max: 3000,
  message: { error: "Too many read requests. Please try again later." },
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

/**
 * Perações de fluxo alto/comum
 * Criar/Editar notas e tarefas
 * 1000 requisições a cada 15 minutos
 */
const standardTrafficLimiter = rateLimit({
  legacyHeaders: false,
  max: 1000,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

const notesBlockWriteWindowMs = Number(
  process.env.NOTES_BLOCKS_WRITE_WINDOW_MS || 5 * 60 * 1000
);
const notesBlockWriteMax = Number(process.env.NOTES_BLOCKS_WRITE_MAX || 3000);

const notesBlockWriteLimiter = rateLimit({
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
  keyGenerator: (req) => req.user?.userId || req.ip,
  legacyHeaders: false,
  max: Number.isFinite(notesBlockWriteMax) ? notesBlockWriteMax : 3000,
  message: { error: "Too many block edit requests. Please try again later." },
  standardHeaders: true,
  windowMs: Number.isFinite(notesBlockWriteWindowMs)
    ? notesBlockWriteWindowMs
    : 5 * 60 * 1000,
});

/**
 * Operações Estruturais: Criar Organização, Alterar Planos, Configurações de Perfil
 * 300 requisições a cada 30 minutos
 */
const structuralLimiter = rateLimit({
  legacyHeaders: false,
  max: 300,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  windowMs: 30 * 60 * 1000,
});

/**
 * Rotas de IA e Operações de Backup/Upload Pesados
 * Weave-IA, Backups, Uploads Grandes
 * 1500 requisições a cada 10 minutos
 */
const heavyOperationLimiter = rateLimit({
  legacyHeaders: false,
  max: 1500,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  windowMs: 10 * 60 * 1000,
});

/**
 * Autenticação e Recuperação de Senha
 * 50 tentativas falhas a cada 15 minutos
 */
const authSecurityLimiter = rateLimit({
  legacyHeaders: false,
  max: 50,
  message: { error: "Too many failed attempts. Please try again later." },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

module.exports = {
  apiLimiter: highTrafficLimiter,
  authLimiter: authSecurityLimiter,
  authSecurityLimiter,
  heavyOperationLimiter,
  highTrafficLimiter,
  notesBlockWriteLimiter,
  standardTrafficLimiter,
  strictLimiter: heavyOperationLimiter,
  structuralLimiter,
};
