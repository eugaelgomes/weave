const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const NotificationsBaseController = require("@/modules/notifications/controllers/base.controller");

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
        return res.status(404).json({ error: "Notificação não encontrada" });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsDeleteController();
