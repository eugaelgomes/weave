const notificationsReadRepository = require("@/modules/notifications/repositories/notifications-read.repository");
const notificationsCreateRepository = require("@/modules/notifications/repositories/notifications-create.repository");
const notificationsUpdateRepository = require("@/modules/notifications/repositories/notifications-update.repository");
const notificationsDeleteRepository = require("@/modules/notifications/repositories/notifications-delete.repository");

const repos = [
  notificationsReadRepository,
  notificationsCreateRepository,
  notificationsUpdateRepository,
  notificationsDeleteRepository,
];

/**
 * Fachada do repositório de notificações (mesma API do singleton anterior).
 */
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      for (const repo of repos) {
        const value = repo[prop];
        if (typeof value === "function") {
          return value.bind(repo);
        }
      }
      return undefined;
    },
  }
);
