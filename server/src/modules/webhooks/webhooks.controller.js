const { v4: uuidv4 } = require("uuid");
const webhooksRepository = require("./webhooks.repository");
const googleService = require("@/services/hooks/google/index");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const WEBHOOK_BASE = process.env.GOOGLE_WEBHOOK_URL || "http://localhost:8080";
const CALENDAR_WEBHOOK_ADDRESS = `${WEBHOOK_BASE}/api/v1/webhooks/google/calendar`;

class WebhooksController {
  async googleAuth(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const url = googleService.getAuthUrl(userId);
      res.redirect(url);
    } catch (error) {
      console.error("[Google Auth]", error);
      res.status(500).json({ error: "Falha ao gerar URL de autenticação Google" });
    }
  }

  async googleCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({ error: "Parâmetros code/state ausentes" });
      }

      const { userId } = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      if (!userId) {
        return res.status(400).json({ error: "userId não encontrado no state" });
      }

      const tokens = await googleService.getTokens(code);
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      await webhooksRepository.saveGoogleTokens(userId, tokens.access_token, tokens.refresh_token, expiresAt);
      console.log(`[Google Calendar] Tokens salvos para o usuário ${userId}`);

      await this._registerCalendarWatch(userId, tokens);

      res.redirect(`${FRONTEND_URL}/app/settings?google_calendar=connected`);
    } catch (error) {
      console.error("[Google Callback]", error);
      res.redirect(`${FRONTEND_URL}/app/settings?google_calendar=error`);
    }
  }

  async handleGoogleCalendarWebhook(req, res) {
    try {
      const channelId = req.headers["x-goog-channel-id"];
      const resourceState = req.headers["x-goog-resource-state"];

      if (!channelId || !resourceState) {
        return res.status(400).send("Missing headers");
      }

      if (resourceState === "sync") {
        console.log(`[Google Calendar] Sync recebido para channel: ${channelId}`);
        return res.status(200).send("OK");
      }

      console.log(`[Google Calendar] Evento recebido para channel: ${channelId}`);
      return res.status(200).send("OK");
    } catch (error) {
      console.error("[Google Webhook]", error.message);
      res.status(200).send("OK");
    }
  }

  async _registerCalendarWatch(userId, tokens) {
    const channelId = uuidv4();
    const calendarId = "primary";

    try {
      const calendar = googleService.getCalendarClient(tokens);

      const { data } = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: CALENDAR_WEBHOOK_ADDRESS,
        },
      });

      await webhooksRepository.createWebhook({
        userId,
        calendarId,
        channelId,
        resourceId: data.resourceId,
        syncToken: null,
        expiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
      });

      console.log(`[Google Calendar] Webhook registrado — channel: ${channelId}`);
    } catch (error) {
      console.warn(`[Google Calendar] Watch falhou (tokens salvos): ${error.message}`);
    }
  }
}

module.exports = new WebhooksController();
