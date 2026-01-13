const express = require("express");

const backupController = require("@/modules/backup/backup.controller");

const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

// GET /api/backup/download/:token - Download de backup (não requer autenticação)
router.get("/download/:token", (req, res, next) => {
  backupController.downloadBackup(req, res, next);
});

// Aplicar middleware de autenticação nas demais rotas
router.use(verifyToken);

// POST /api/backup/request - Solicitar backup assíncrono
router.post("/request", (req, res, next) => {
  backupController.requestBackup(req, res, next);
});

// GET /api/backup/status/:jobId - Verificar status de backup
router.get("/status/:jobId", (req, res, next) => {
  backupController.getBackupStatus(req, res, next);
});

// GET /api/backup/jobs - Listar jobs de backup do usuário
router.get("/jobs", (req, res, next) => {
  backupController.getUserBackupJobs(req, res, next);
});

// GET /api/backup/summary - Resumo dos dados para backup (mantido)
router.get("/summary", (req, res, next) => {
  backupController.getBackupSummary(req, res, next);
});

module.exports = router;
