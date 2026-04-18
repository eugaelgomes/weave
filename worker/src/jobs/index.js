const { registerJob, getProcessor, listRegisteredJobs } = require("./registry");
const cleanupJob = require("./cleanup.job");
const { logger } = require("../lib");

function initializeJobs() {
  registerJob(cleanupJob.type, cleanupJob.process);

  logger.info("Job processors initialized", {
    registered: listRegisteredJobs(),
  });
}

module.exports = {
  getProcessor,
  initializeJobs,
  listRegisteredJobs,
  registerJob,
};
