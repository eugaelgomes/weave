const { fromUnknown } = require("@/errors");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const NotificationsBaseController = require("@/modules/notifications/controllers/base.controller");

class NotificationsUpdateController extends NotificationsBaseController {
  constructor() {
    super();
    this.notificationsRepository = NotificationsRepository;
  }

  async markNotificationRead(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { notificationId } = req.params;
      const rawIsRead = req.body?.is_read ?? req.body?.isRead;
      const parsedIsRead = this._extractBoolean(rawIsRead);

      if (parsedIsRead === null) {
        return res
          .status(400)
          .json({ error: "O campo is_read deve ser booleano" });
      }

      const isRead = typeof parsedIsRead === "boolean" ? parsedIsRead : true;

      const result = await this.notificationsRepository.markNotificationRead({
        notificationId,
        userId,
        isRead,
      });

      const notification = this._handleRepositoryResult(result, res);
      if (!notification) return;

      res.status(200).json({ notification });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const updated = await this.notificationsRepository.markAllAsRead(userId);

      res.status(200).json({ updated });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async toggleTrashStatus(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { notificationId } = req.params;
      const rawInTrash = req.body?.in_trash ?? req.body?.inTrash;
      const parsedInTrash = this._extractBoolean(rawInTrash);

      if (parsedInTrash === null) {
        return res
          .status(400)
          .json({ error: "O campo in_trash deve ser booleano" });
      }

      const inTrash = typeof parsedInTrash === "boolean" ? parsedInTrash : true;

      const result = await this.notificationsRepository.toggleTrashStatus({
        notificationId,
        userId,
        inTrash,
      });

      const notification = this._handleRepositoryResult(result, res);
      if (!notification) return;

      res.status(200).json({ notification });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new NotificationsUpdateController();
