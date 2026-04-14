const express = require("express");
const NotificationsListController = require("@/modules/notifications/controllers/notifications-list.controller");
const NotificationsCreateController = require("@/modules/notifications/controllers/notifications-create.controller");
const NotificationsUpdateController = require("@/modules/notifications/controllers/notifications-update.controller");
const NotificationsDeleteController = require("@/modules/notifications/controllers/notifications-delete.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/request-limiters");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  NotificationsListController.listNotifications.bind(NotificationsListController)
);

router.post(
  "/",
  standardTrafficLimiter,
  NotificationsCreateController.createNotification.bind(
    NotificationsCreateController
  )
);

router.patch(
  "/mark-all-read",
  standardTrafficLimiter,
  NotificationsUpdateController.markAllAsRead.bind(NotificationsUpdateController)
);

router.patch(
  "/:notificationId/read",
  standardTrafficLimiter,
  NotificationsUpdateController.markNotificationRead.bind(
    NotificationsUpdateController
  )
);

router.patch(
  "/:notificationId/trash",
  standardTrafficLimiter,
  NotificationsUpdateController.toggleTrashStatus.bind(
    NotificationsUpdateController
  )
);

router.delete(
  "/:notificationId",
  standardTrafficLimiter,
  NotificationsDeleteController.deleteNotification.bind(
    NotificationsDeleteController
  )
);

module.exports = router;
