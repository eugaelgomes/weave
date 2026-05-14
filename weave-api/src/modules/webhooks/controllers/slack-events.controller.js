const { verifySlackSignature } = require("@/services/slack/slack.client");

/**
 * Slack Events API / interactivity endpoints (public).
 */
class SlackEventsController {
  /**
   * Handles Events API (URL verification and future events).
   * `POST /webhooks/slack/events`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async handleEvents(req, res) {
    const signingSecret = process.env.SLACK_SIGNING_SECRET || "";
    if (!signingSecret) {
      return res.status(503).json({
        code: "SLACK_SIGNING_NOT_CONFIGURED",
        error: "Slack signing secret is not configured",
      });
    }

    const rawBody = req.rawBody;
    const sig = req.headers["x-slack-signature"];
    const ts = req.headers["x-slack-request-timestamp"];
    const ok = verifySlackSignature({
      rawBody,
      signingSecret,
      slackSignature: typeof sig === "string" ? sig : "",
      slackTimestamp: typeof ts === "string" ? ts : "",
    });
    if (!ok) {
      return res.status(401).json({ error: "Invalid Slack signature" });
    }

    const body = req.body;
    if (body?.type === "url_verification" && body?.challenge) {
      return res.status(200).json({ challenge: body.challenge });
    }

    return res.status(200).json({ ok: true });
  }

  /**
   * Reserved for Block Kit / shortcuts (payload is URL-encoded).
   * `POST /webhooks/slack/interactivity`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async handleInteractivity(req, res) {
    const signingSecret = process.env.SLACK_SIGNING_SECRET || "";
    if (!signingSecret) {
      return res.status(503).json({
        code: "SLACK_SIGNING_NOT_CONFIGURED",
        error: "Slack signing secret is not configured",
      });
    }

    const rawBody = req.rawBody;
    const sig = req.headers["x-slack-signature"];
    const ts = req.headers["x-slack-request-timestamp"];
    const ok = verifySlackSignature({
      rawBody,
      signingSecret,
      slackSignature: typeof sig === "string" ? sig : "",
      slackTimestamp: typeof ts === "string" ? ts : "",
    });
    if (!ok) {
      return res.status(401).json({ error: "Invalid Slack signature" });
    }

    return res.status(200).json({ ok: true });
  }
}

module.exports = new SlackEventsController();
