const { registerJob, getProcessor, listRegisteredJobs } = require("./registry");
const aiReportSchedulerProcessor = require("./ai-report-scheduler.processor");
const backupExportProcessor = require("./backup-export.processor");
const cleanupJob = require("./cleanup.job");
const domainVerificationProcessor = require("./domain-verification.processor");
const dueDateReminderProcessor = require("./due-date-reminder.processor");
const emailProcessor = require("./email.processor");
const embeddingProcessor = require("./embedding.processor");
const plansCycleProcessor = require("./plans-cycle.processor");
const plansUsageProcessor = require("./plans-usage.processor");
const { logger } = require("../lib");

function initializeJobs() {
  registerJob(cleanupJob.type, cleanupJob.process);

  emailProcessor.start().catch((err) => {
    logger.error("Failed to start email processor", { error: err.message });
  });
  backupExportProcessor.start().catch((err) => {
    logger.error("Failed to start backup export processor", {
      error: err.message,
    });
  });
  domainVerificationProcessor.start().catch((err) => {
    logger.error("Failed to start domain verification processor", {
      error: err.message,
    });
  });
  plansUsageProcessor.start().catch((err) => {
    logger.error("Failed to start plans usage processor", {
      error: err.message,
    });
  });
  plansCycleProcessor.start().catch((err) => {
    logger.error("Failed to start plans cycle processor", {
      error: err.message,
    });
  });
  dueDateReminderProcessor.start().catch((err) => {
    logger.error("Failed to start due date reminder processor", {
      error: err.message,
    });
  });
  embeddingProcessor.start().catch((err) => {
    logger.error("Failed to start embedding processor", {
      error: err.message,
    });
  });
  aiReportSchedulerProcessor.start().catch((err) => {
    logger.error("Failed to start AI report scheduler", {
      error: err.message,
    });
  });

  logger.info("Job processors initialized", {
    aiReportSchedulerRunning: true,
    backupExportQueueListening: true,
    domainVerifyQueueListening: true,
    dueDateReminderProcessorRunning: true,
    emailQueueListening: true,
    plansCycleProcessorRunning: true,
    plansUsageQueueListening: true,
    registered: listRegisteredJobs(),
  });
}

module.exports = {
  getProcessor,
  initializeJobs,
  listRegisteredJobs,
  registerJob,
};
