const express = require("express");
const notificationsController = require("@/modules/notifications/notifications.controller");
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
	notificationsController.listNotifications.bind(notificationsController)
);

router.post(
	"/",
	standardTrafficLimiter,
	notificationsController.createNotification.bind(notificationsController)
);

router.patch(
	"/mark-all-read",
	standardTrafficLimiter,
	notificationsController.markAllAsRead.bind(notificationsController)
);

router.patch(
	"/:notificationId/read",
	standardTrafficLimiter,
	notificationsController.markNotificationRead.bind(notificationsController)
);

router.patch(
	"/:notificationId/trash",
	standardTrafficLimiter,
	notificationsController.toggleTrashStatus.bind(notificationsController)
);

router.delete(
	"/:notificationId",
	standardTrafficLimiter,
	notificationsController.deleteNotification.bind(notificationsController)
);

module.exports = router;
