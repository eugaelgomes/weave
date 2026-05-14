const express = require("express");
const GoogleOauthController = require("@/modules/webhooks/controllers/google-oauth.controller");
const GoogleCalendarController = require("@/modules/webhooks/controllers/google-calendar.controller");
const SlackOauthController = require("@/modules/webhooks/controllers/slack-oauth.controller");
const SlackEventsController = require("@/modules/webhooks/controllers/slack-events.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

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

router.get(
  "/slack/install",
  verifyToken,
  standardTrafficLimiter,
  SlackOauthController.slackInstall.bind(SlackOauthController)
);

router.get(
  "/slack/oauth/callback",
  SlackOauthController.slackOAuthCallback.bind(SlackOauthController)
);

router.post(
  "/slack/events",
  SlackEventsController.handleEvents.bind(SlackEventsController)
);

router.post(
  "/slack/interactivity",
  SlackEventsController.handleInteractivity.bind(SlackEventsController)
);

module.exports = router;
