const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const DownloadBackupController = require("@/modules/backup/controllers/download-backup.controller");
const BackupExportController = require("@/modules/backup/controllers/backup-export.controller");
const BackupJobsController = require("@/modules/backup/controllers/backup-jobs.controller");
const BackupSummaryController = require("@/modules/backup/controllers/backup-summary.controller");

const router = express.Router();

router.get("/download/:token", (req, res, next) => {
  DownloadBackupController.downloadBackup(req, res, next);
});

router.use(verifyToken);

router.post("/request", (req, res, next) => {
  BackupExportController.requestBackup(req, res, next);
});

router.get("/status/:jobId", (req, res, next) => {
  BackupJobsController.getBackupStatus(req, res, next);
});

router.get("/jobs", (req, res, next) => {
  BackupJobsController.getUserBackupJobs(req, res, next);
});

router.get("/summary", (req, res, next) => {
  BackupSummaryController.getBackupSummary(req, res, next);
});

module.exports = router;
