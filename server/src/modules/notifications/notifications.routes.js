const express = require("express");
const NotificationsListController = require("@/modules/notifications/controllers/notifications-list.controller");
const NotificationsCreateController = require("@/modules/notifications/controllers/notifications-create.controller");
const NotificationsUpdateController = require("@/modules/notifications/controllers/notifications-update.controller");
const NotificationsDeleteController = require("@/modules/notifications/controllers/notifications-delete.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { validate } = require("@/middlewares/validation/validate");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
  createNotificationSchema,
  markNotificationReadSchema,
  toggleTrashStatusSchema,
} = require("./schemas/notifications.schema");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  validate(listNotificationsQuerySchema, "query"),
  NotificationsListController.listNotifications.bind(NotificationsListController)
);

router.post(
  "/",
  standardTrafficLimiter,
  validate(createNotificationSchema, "body"),
  NotificationsCreateController.createNotification.bind(NotificationsCreateController)
);

router.patch(
  "/mark-all-read",
  standardTrafficLimiter,
  NotificationsUpdateController.markAllAsRead.bind(NotificationsUpdateController)
);

router.patch(
  "/:notificationId/read",
  standardTrafficLimiter,
  validate(notificationIdParamSchema, "params"),
  validate(markNotificationReadSchema, "body"),
  NotificationsUpdateController.markNotificationRead.bind(NotificationsUpdateController)
);

router.patch(
  "/:notificationId/trash",
  standardTrafficLimiter,
  validate(notificationIdParamSchema, "params"),
  validate(toggleTrashStatusSchema, "body"),
  NotificationsUpdateController.toggleTrashStatus.bind(NotificationsUpdateController)
);

router.delete(
  "/:notificationId",
  standardTrafficLimiter,
  validate(notificationIdParamSchema, "params"),
  NotificationsDeleteController.deleteNotification.bind(NotificationsDeleteController)
);

module.exports = router;
