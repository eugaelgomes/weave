const { fromUnknown } = require("@/errors");
const NotificationsRepository = require("@/modules/messenger/repositories/notifications.repository");
const NotificationsBaseController = require("@/modules/messenger/controllers/base.controller");

class NotificationsListController extends NotificationsBaseController {
  constructor() {
    super();
    this.notificationsRepository = NotificationsRepository;
  }

  _parsePagination(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 5), 50);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    return { limit, offset, page };
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

  async listNotifications(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { limit, page, offset } = this._parsePagination(req.query);
      const filter = this._normalizeFilter(req.query.status);
      const order = this._normalizeOrder(req.query.order);

      const { notifications, total } = await this.notificationsRepository.listUserNotifications({
        entityType: req.query.entity_type,
        filter,
        limit,
        offset,
        order,
        search: req.query.search,
        type: req.query.type,
        userId,
      });

      const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

      res.status(200).json({
        notifications,
        pagination: {
          limit,
          page,
          total,
          total_pages: totalPages,
        },
      });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new NotificationsListController();
