const { v4: uuidv4 } = require("uuid");
const googleService = require("@/hooks/google/google-calendar");
const GoogleOauthTokensRepository = require("@/modules/webhooks/repositories/google-oauth-tokens.repository");
const GoogleCalendarWebhooksRepository = require("@/modules/webhooks/repositories/google-calendar-webhooks.repository");
const WebhooksBaseController = require("@/modules/webhooks/controllers/base.controller");

const WEBHOOK_BASE = process.env.GOOGLE_WEBHOOK_URL || "http://localhost:8080";
const CALENDAR_WEBHOOK_ADDRESS = `${WEBHOOK_BASE}/api/v1/webhooks/google/calendar`;

/**
 * Google Calendar: webhook push, SSE, event listing, status and disconnection.
 */
class GoogleCalendarController extends WebhooksBaseController {
  constructor() {
    super();
    this.calendarSseClients = new Map();
  }

  /**
   * Registers a webhook (watch) on Google Calendar to receive notifications
   * of changes in the user's primary calendar.
   * @param {string} userId - User ID in the system
   * @param {object} tokens - Google OAuth2 tokens (access_token, refresh_token)
   */
  async registerCalendarWatch(userId, tokens) {
    const channelId = uuidv4();
    const calendarId = "primary";

    try {
      const calendar = googleService.getCalendarClient(tokens);

      const { data } = await calendar.events.watch({
        calendarId,
        requestBody: {
          address: CALENDAR_WEBHOOK_ADDRESS,
          id: channelId,
          type: "web_hook",
        },
      });

      await GoogleCalendarWebhooksRepository.createWebhook({
        calendarId,
        channelId,
        expiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
        resourceId: data.resourceId,
        syncToken: null,
        userId,
      });
    } catch (error) {
      console.warn(
        `[Google Calendar] Watch falhou (tokens salvos): ${error.message}`
      );
    }
  }

  /**
   * Receives push notifications from Google Calendar (webhook).
   * Responds 200 for sync and received events.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async handleGoogleCalendarWebhook(req, res) {
    try {
      const channelId = req.headers["x-goog-channel-id"];
      const resourceState = req.headers["x-goog-resource-state"];
      const messageNumber = req.headers["x-goog-message-number"];

      if (!channelId || !resourceState) {
        return res.status(400).send("Missing headers");
      }

      if (resourceState === "sync") {
        return res.status(200).send("OK");
      }

      res.status(200).send("OK");
      setImmediate(async () => {
        await this._processCalendarWebhookNotification({
          channelId,
          messageNumber,
          resourceState,
        });
      });
      return;
    } catch (error) {
      console.error("[Google Webhook]", error.message);
      res.status(200).send("OK");
    }
  }

  /**
   * Opens an SSE stream to notify the frontend about changes received via webhook.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async streamCalendarEvents(req, res) {
    const userId = this._requireAuthenticatedUser(req, res);
    if (!userId) return;

    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    if (!this.calendarSseClients.has(userId)) {
      this.calendarSseClients.set(userId, new Set());
    }

    const clients = this.calendarSseClients.get(userId);
    clients.add(res);

    res.write(
      `event: connected\ndata: ${JSON.stringify({ connected: true, ts: Date.now() })}\n\n`
    );

    const heartbeat = setInterval(() => {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (clients.size === 0) {
        this.calendarSseClients.delete(userId);
      }
    });
  }

  /**
   * Returns Google Calendar events for the authenticated user.
   * Accepts query params `timeMin` and `timeMax` to filter the interval.
   * Fetches events from all accessible calendars and deduplicates by id.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getCalendarEvents(req, res) {
    let tokensLinked = false;
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const tokens = await GoogleOauthTokensRepository.getGoogleTokens(userId);
      if (!tokens) {
        return res.status(200).json({ connected: false, events: [] });
      }

      tokensLinked = true;

      const { timeMin, timeMax } = req.query;
      const now = new Date();
      const defaultMin = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      ).toISOString();
      const defaultMax = new Date(
        now.getFullYear(),
        now.getMonth() + 3,
        0
      ).toISOString();

      const { calendar, auth } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at
          ? new Date(tokens.expires_at).getTime()
          : null,
        refresh_token: tokens.refresh_token,
      });

      const calendarList = await calendar.calendarList.list();
      const calendars = (calendarList.data.items || []).filter(
        (c) =>
          c.accessRole === "owner" ||
          c.accessRole === "writer" ||
          c.accessRole === "reader"
      );

      const allItems = [];
      for (const cal of calendars) {
        try {
          const { data: calData } = await calendar.events.list({
            calendarId: cal.id,
            maxResults: 250,
            orderBy: "startTime",
            singleEvents: true,
            timeMax: timeMax || defaultMax,
            timeMin: timeMin || defaultMin,
          });
          const items = calData.items || [];
          allItems.push(...items);
        } catch (calErr) {
          console.warn(
            `[Google Calendar] Falha ao buscar ${cal.id}: ${calErr.message}`
          );
        }
      }

      const refreshed = auth.credentials;
      if (
        refreshed.access_token &&
        refreshed.access_token !== tokens.access_token
      ) {
        const newExpiry = refreshed.expiry_date
          ? new Date(refreshed.expiry_date)
          : null;
        await GoogleOauthTokensRepository.updateGoogleAccessToken(
          userId,
          refreshed.access_token,
          newExpiry
        );
      }

      const seen = new Set();
      const raw = allItems.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      raw.sort((a, b) => {
        const sa = a.start?.dateTime || a.start?.date || "";
        const sb = b.start?.dateTime || b.start?.date || "";
        return sa.localeCompare(sb);
      });

      const events = raw.map((e) => ({
        allDay: !e.start?.dateTime,
        colorId: e.colorId || null,
        description: e.description || null,
        end: e.end?.dateTime || e.end?.date || null,
        htmlLink: e.htmlLink || null,
        id: e.id,
        location: e.location || null,
        start: e.start?.dateTime || e.start?.date || null,
        title: e.summary || "(sem título)",
      }));

      res.json({ connected: true, events });
    } catch (error) {
      const httpStatus = error?.response?.status ?? error?.status;
      const isUnauthorized =
        error?.code === 401 ||
        httpStatus === 401 ||
        String(error?.code) === "401";
      if (isUnauthorized) {
        return res.status(200).json({
          connected: false,
          events: [],
          error: "Token expirado, reconecte o Google Calendar",
        });
      }
      console.error("[Google Calendar] getCalendarEvents:", error?.message);
      return res.status(200).json({
        connected: tokensLinked,
        events: [],
        error: "Falha ao buscar eventos do Google Calendar",
      });
    }
  }

  /**
   * Checks if the user has stored Google Calendar tokens.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getCalendarStatus(req, res) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const connected =
        await GoogleOauthTokensRepository.hasGoogleTokens(userId);
      res.json({ connected });
    } catch {
      res
        .status(500)
        .json({ error: "Falha ao verificar status do Google Calendar" });
    }
  }

  /**
   * Disconnects Google Calendar: stops active webhooks on Google
   * and removes tokens and webhooks from the database.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async disconnectCalendar(req, res) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const tokens = await GoogleOauthTokensRepository.getGoogleTokens(userId);
      if (tokens) {
        const activeWebhooks =
          await GoogleCalendarWebhooksRepository.getActiveWebhooks(userId);
        for (const wh of activeWebhooks) {
          try {
            const calendar = googleService.getCalendarClient(tokens);
            await calendar.channels.stop({
              requestBody: {
                id: wh.channel_id,
                resourceId: wh.resource_id,
              },
            });
          } catch (err) {
            console.warn(
              `[Google Calendar] Falha ao parar channel ${wh.channel_id}: ${err.message}`
            );
          }
        }
      }

      await GoogleCalendarWebhooksRepository.clearWebhooks(userId);
      await GoogleOauthTokensRepository.clearGoogleTokens(userId);

      res.json({
        success: true,
        message: "Google Calendar desconectado com sucesso",
      });
    } catch (error) {
      console.error("[Google Calendar Disconnect]", error);
      res.status(500).json({ error: "Falha ao desconectar Google Calendar" });
    }
  }

  /**
   * @param {{channelId: string, resourceState: string, messageNumber?: string}} params
   * @private
   */
  async _processCalendarWebhookNotification({
    channelId,
    resourceState,
    messageNumber,
  }) {
    try {
      const webhook =
        await GoogleCalendarWebhooksRepository.getWebhookByChannelId(channelId);
      if (!webhook?.user_id) return;

      this._broadcastCalendarUpdate(webhook.user_id, {
        channelId,
        messageNumber: messageNumber || null,
        resourceState,
        ts: Date.now(),
      });
    } catch (error) {
      console.error("[Google Webhook Async Process]", error.message);
    }
  }

  /**
   * @param {string} userId
   * @param {object} payload
   * @private
   */
  _broadcastCalendarUpdate(userId, payload) {
    const clients = this.calendarSseClients.get(userId);
    if (!clients || clients.size === 0) return;

    const data = `event: calendar-update\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      client.write(data);
    }
  }
}

module.exports = new GoogleCalendarController();
