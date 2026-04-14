const express = require("express");
const GoogleOauthController = require("@/modules/webhooks/controllers/google-oauth.controller");
const GoogleCalendarController = require("@/modules/webhooks/controllers/google-calendar.controller");
const { verifyToken } = require("@/middlewares/verify-token");

const router = express.Router();

router.get(
  "/google/auth",
  verifyToken,
  GoogleOauthController.googleAuth.bind(GoogleOauthController)
);

router.get(
  "/google/callback",
  GoogleOauthController.googleCallback.bind(GoogleOauthController)
);

router.post(
  "/google/calendar",
  GoogleCalendarController.handleGoogleCalendarWebhook.bind(
    GoogleCalendarController
  )
);

router.get(
  "/google/calendar/events",
  verifyToken,
  GoogleCalendarController.getCalendarEvents.bind(GoogleCalendarController)
);

router.get(
  "/google/calendar/stream",
  verifyToken,
  GoogleCalendarController.streamCalendarEvents.bind(GoogleCalendarController)
);

router.get(
  "/google/calendar/status",
  verifyToken,
  GoogleCalendarController.getCalendarStatus.bind(GoogleCalendarController)
);

router.delete(
  "/google/calendar/disconnect",
  verifyToken,
  GoogleCalendarController.disconnectCalendar.bind(GoogleCalendarController)
);

module.exports = router;
