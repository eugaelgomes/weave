const { registerJob, getProcessor, listRegisteredJobs } = require("./registry");
const cleanupJob = require("./cleanup.job");
const emailProcessor = require("./email.processor"); // Importando processador de emails
const { logger } = require("../lib");

function initializeJobs() {
  registerJob(cleanupJob.type, cleanupJob.process);

  // Iniciar processamento da fila de emails no Valkey/Redis
  emailProcessor.start().catch((err) => {
    logger.error("Failed to start email processor", { error: err.message });
  });

  logger.info("Job processors initialized", {
    registered: listRegisteredJobs(),
    emailQueueListening: true
  });
}

module.exports = {
  getProcessor,
  initializeJobs,
  listRegisteredJobs,
  registerJob,
};
