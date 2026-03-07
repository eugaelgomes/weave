const express = require("express");
const webhooksController = require("./webhooks.controller");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

router.get("/google/auth", verifyToken, webhooksController.googleAuth);
router.get("/google/callback", webhooksController.googleCallback);
router.post("/google/calendar", webhooksController.handleGoogleCalendarWebhook);

module.exports = router;
