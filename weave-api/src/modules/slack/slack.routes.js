const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  structuralLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const SlackIntegrationsController = require("@/modules/slack/controllers/slack-integrations.controller");
const SlackOauthController = require("@/modules/slack/controllers/slack-oauth.controller");
const SlackEventsController = require("@/modules/slack/controllers/slack-events.controller");

const router = express.Router();

// -----------------------------------------------------------------------------
// Organization Integrations
// -----------------------------------------------------------------------------

router.get(
  "/integrations",
  verifyToken,
  standardTrafficLimiter,
  SlackIntegrationsController.getSlackIntegration.bind(SlackIntegrationsController)
);

router.put(
  "/integrations/default-channel",
  verifyToken,
  structuralLimiter,
  SlackIntegrationsController.setDefaultChannel.bind(SlackIntegrationsController)
);

router.delete(
  "/integrations",
  verifyToken,
  structuralLimiter,
  SlackIntegrationsController.disconnectSlack.bind(SlackIntegrationsController)
);

// -----------------------------------------------------------------------------
// OAuth Installation Flow
// -----------------------------------------------------------------------------

router.get(
  "/install",
  verifyToken,
  standardTrafficLimiter,
  SlackOauthController.slackInstall.bind(SlackOauthController)
);

router.get(
  "/oauth/callback",
  SlackOauthController.slackOAuthCallback.bind(SlackOauthController)
);

// -----------------------------------------------------------------------------
// Events API & Interactivity (Public Webhooks)
// -----------------------------------------------------------------------------

router.post(
  "/events",
  SlackEventsController.handleEvents.bind(SlackEventsController)
);

router.post(
  "/interactivity",
  SlackEventsController.handleInteractivity.bind(SlackEventsController)
);

module.exports = router;
