const { logger } = require("../lib");

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

module.exports = {
  getProcessor,
  listRegisteredJobs,
  registerJob,
};
