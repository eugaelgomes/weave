const { createMailService } = require("./sender");
const { buildMailTemplate, escapeHtml } = require("./template");

module.exports = {
  buildMailTemplate,
  createMailService,
  escapeHtml,
};
