const { fromUnknown } = require("@/errors");
const NotificationsRepository = require("@/modules/messenger/repositories/notifications.repository");
const NotificationsBaseController = require("@/modules/messenger/controllers/base.controller");

class NotificationsDeleteController extends NotificationsBaseController {
  constructor() {
    super();
    this.notificationsRepository = NotificationsRepository;
  }

  async deleteNotification(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { notificationId } = req.params;
      const result = await this.notificationsRepository.deleteNotification({
        notificationId,
        userId,
      });

      if (!result) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new NotificationsDeleteController();
