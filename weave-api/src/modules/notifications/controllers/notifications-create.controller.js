const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const NotificationsBaseController = require("@/modules/notifications/controllers/base.controller");

class NotificationsCreateController extends NotificationsBaseController {
  constructor() {
    super();
    this.notificationsRepository = NotificationsRepository;
  }

  async createNotification(req, res, next) {
    try {
      const actorId = this._requireAuthenticatedUser(req, res);
      if (!actorId) return;

      const {
        user_id: targetUserId,
        target_user_id,
        type,
        entity_type,
        entity_id,
        title,
        content,
      } = req.body || {};

      const userId = targetUserId || target_user_id;

      if (!userId || !type || !entity_type || !entity_id || !title) {
        return res.status(400).json({
          error:
            "Campos obrigatórios: user_id, type, entity_type, entity_id e title",
        });
      }

      const notification =
        await this.notificationsRepository.createNotification({
          userId,
          actorId,
          type,
          entityType: entity_type,
          entityId: entity_id,
          title,
          content: content && typeof content === "object" ? content : {},
        });

      res.status(201).json({ notification });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsCreateController();
