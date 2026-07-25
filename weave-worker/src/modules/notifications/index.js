const { createMailService } = require("./sender");
const { buildMailTemplate, escapeHtml } = require("./template");
const emailProcessor = require("./email.processor");
const dueDateReminder = require("./due-date-reminder.processor");

module.exports = {
  buildMailTemplate,
  createMailService,
  dueDateReminder,
  emailProcessor,
  escapeHtml,
};
