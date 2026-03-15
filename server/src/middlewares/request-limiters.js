const rateLimit = require("express-rate-limit");

/**
 * operações de fluxo muito alto: Leitura de dados (GET)
 * Listagem de notas, projetos, notificações
 * 300 requisições a cada 15 minutos
 */
const highTrafficLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many read requests. Please try again later." },
});

/**
 * Perações de fluxo alto/comum
 * Criar/Editar notas e tarefas
 * 100 requisições a cada 15 minutos
 */
const standardTrafficLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed attempts. Please try again later."},
});

/**
 * Operações Estruturais: Criar Organização, Alterar Planos, Configurações de Perfil
 * 30 requisições a cada 30 minutos
 */
const structuralLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error:"Too many failed attempts. Please try again later."},
});

/**
 * Rotas de IA e Operações de Backup/Upload Pesados
 * Weave-IA, Backups, Uploads Grandes
 * 15 requisições a cada 10 minutos
 */
const heavyOperationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed attempts. Please try again later." },
});

/**
 * Autenticação e Recuperação de Senha
 * 10 tentativas falhas a cada 15 minutos
 */
const authSecurityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
  apiLimiter: highTrafficLimiter,
  strictLimiter: heavyOperationLimiter,
  authLimiter: authSecurityLimiter,
};
