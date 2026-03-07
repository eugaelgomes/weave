const express = require("express");
const webhooksController = require("./webhooks.controller");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

router.get("/google/auth", verifyToken, webhooksController.googleAuth.bind(webhooksController));
router.get("/google/callback", webhooksController.googleCallback.bind(webhooksController));
router.post("/google/calendar", webhooksController.handleGoogleCalendarWebhook.bind(webhooksController));

module.exports = router;
