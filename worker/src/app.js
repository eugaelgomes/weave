const { logger } = require("@theweave/database");

const {
  backup,
  notifications,
  notes,
  organizations,
  plans,
  tracing,
  "weave-ai": weaveAi,
} = require("./modules");

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

  // tracing
  registerJob("tracing_events", tracing.tracingEventsProcessor);

  logger.info("Jobs initialized", { registered: listRegisteredJobs() });
}

function startAllJobs() {
  for (const [name, processor] of jobProcessors.entries()) {
    if (processor && typeof processor.start === "function") {
      logger.info(`Starting processor: ${name}`);
      processor.start().catch((error) => {
        logger.error(`Processor ${name} failed`, { error: error.message, stack: error.stack });
      });
    }
  }
}

function stopAllJobs() {
  for (const [name, processor] of jobProcessors.entries()) {
    if (processor && typeof processor.stop === "function") {
      logger.info(`Stopping processor: ${name}`);
      try {
        processor.stop();
      } catch (error) {
        logger.error(`Error stopping processor ${name}`, { error: error.message });
      }
    }
  }
}

module.exports = {
  getProcessor,
  initializeJobs,
  listRegisteredJobs,
  registerJob,
  startAllJobs,
  stopAllJobs,
};
