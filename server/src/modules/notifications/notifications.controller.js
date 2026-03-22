const notificationsRepository = require("@/modules/notifications/notifications.repository");

class NotificationsController {
  constructor() {
    this.notificationsRepository = notificationsRepository;
  }

  _requireAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }

    return userId;
  }

  _parsePagination(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 5), 50);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    return { limit, page, offset };
  }

  _normalizeFilter(rawFilter) {
    const allowed = ["all", "unread", "trash", "read"];
    const normalized = (rawFilter || "all").toLowerCase();

    if (!allowed.includes(normalized)) {
      return "all";
    }

    if (normalized === "read") {
      return "read";
    }

    return normalized;
  }

  _normalizeOrder(order) {
    return order === "asc" ? "asc" : "desc";
  }

  _extractBoolean(value) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (["true", "1"].includes(value.toLowerCase())) {
        return true;
      }
      if (["false", "0"].includes(value.toLowerCase())) {
        return false;
      }
      return null;
    }

    return null;
  }

  _handleRepositoryResult(result, res) {
    if (!result) {
      res.status(404).json({ error: "Notificação não encontrada" });
      return null;
    }

    return result;
  }

  async listNotifications(req, res, next) {
    try {
      const userId = this._requireAuthentication(req, res);
      if (!userId) return;

      const { limit, page, offset } = this._parsePagination(req.query);
      const filter = this._normalizeFilter(req.query.status);
      const order = this._normalizeOrder(req.query.order);

      const { notifications, total } =
        await this.notificationsRepository.listUserNotifications({
          userId,
          filter,
          limit,
          offset,
          type: req.query.type,
          entityType: req.query.entity_type,
          search: req.query.search,
          order,
        });

      const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

      res.status(200).json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createNotification(req, res, next) {
    try {
      const actorId = this._requireAuthentication(req, res);
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

  async markNotificationRead(req, res, next) {
    try {
      const userId = this._requireAuthentication(req, res);
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
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = this._requireAuthentication(req, res);
      if (!userId) return;

      const updated = await this.notificationsRepository.markAllAsRead(userId);

      res.status(200).json({ updated });
    } catch (error) {
      next(error);
    }
  }

  async toggleTrashStatus(req, res, next) {
    try {
      const userId = this._requireAuthentication(req, res);
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
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const userId = this._requireAuthentication(req, res);
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

module.exports = new NotificationsController();
