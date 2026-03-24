const express = require("express");
const webhooksController = require("./webhooks.controller");
const { verifyToken } = require("@/middlewares/verify-token");

const router = express.Router();

router.get(
  "/google/auth",
  verifyToken,
  webhooksController.googleAuth.bind(webhooksController)
);

router.get(
  "/google/callback",
  webhooksController.googleCallback.bind(webhooksController)
);

router.post(
  "/google/calendar",
  webhooksController.handleGoogleCalendarWebhook.bind(webhooksController)
);

router.get(
  "/google/calendar/events",
  verifyToken,
  webhooksController.getCalendarEvents.bind(webhooksController)
);

router.get(
  "/google/calendar/stream",
  verifyToken,
  webhooksController.streamCalendarEvents.bind(webhooksController)
);

router.get(
  "/google/calendar/status",
  verifyToken,
  webhooksController.getCalendarStatus.bind(webhooksController)
);

router.delete(
  "/google/calendar/disconnect",
  verifyToken,
  webhooksController.disconnectCalendar.bind(webhooksController)
);

module.exports = router;
