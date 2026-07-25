const { logger } = require("./config/logger");

const { backup, notifications, notes, organizations, plans, "weave-ai": weaveAi } = require("./modules");

const jobProcessors = new Map();

function registerJob(type, processor) {
  if (jobProcessors.has(type)) {
    logger.warn(`Job processor for type "${type}" is being overwritten`);
  }
  jobProcessors.set(type, processor);
  logger.debug(`Registered job processor: ${type}`);
}

function getProcessor(type) {
  return jobProcessors.get(type);
}

function listRegisteredJobs() {
  return Array.from(jobProcessors.keys());
}

function initializeJobs() {
  // backup
  registerJob("backup_export", backup.exportProcessor);
  registerJob("cleanup_expired_backups", backup.cleanup);

  // notifications
  registerJob("send_email", notifications.emailProcessor);
  registerJob("due_date_reminder", notifications.dueDateReminder);

  // notes
  registerJob("note_embedding", notes.embedding);

  // organizations
  registerJob("domain_verification", organizations.domainVerification);

  // plans
  registerJob("plans_cycle", plans.cycle);
  registerJob("plans_usage", plans.usage);

  // weave-ai
  registerJob("ai_report_delivery", weaveAi.reportDelivery);
  registerJob("ai_report_scheduler", weaveAi.reportScheduler);

  logger.info("Jobs initialized", { registered: listRegisteredJobs() });
}

module.exports = {
  getProcessor,
  initializeJobs,
  listRegisteredJobs,
  registerJob,
};
