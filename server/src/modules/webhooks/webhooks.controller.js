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

  async getCalendarEvents(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

      const tokens = await webhooksRepository.getGoogleTokens(userId);
      if (!tokens) {
        return res.status(404).json({ connected: false, error: "Google Calendar não conectado" });
      }

      const { timeMin, timeMax } = req.query;
      const now = new Date();
      const defaultMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const defaultMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

      const { calendar, auth } = googleService.getCalendarClientWithAuth({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : null,
        refresh_token: tokens.refresh_token,
      });

      // Buscar lista de calendários do usuário
      const calendarList = await calendar.calendarList.list();
      const calendars = (calendarList.data.items || []).filter(
        (c) => c.accessRole === "owner" || c.accessRole === "writer" || c.accessRole === "reader"
      );
      console.log(`[Google Calendar] Calendários do usuário (${calendars.length}):`);
      calendars.forEach((c) => {
        console.log(`  - ${c.id} | ${c.summary} | role=${c.accessRole} | primary=${!!c.primary}`);
      });

      // Buscar eventos de todos os calendários
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
          console.log(`[Google Calendar] ${cal.summary} (${cal.id}): ${items.length} eventos`);
          allItems.push(...items);
        } catch (calErr) {
          console.warn(`[Google Calendar] Falha ao buscar ${cal.id}: ${calErr.message}`);
        }
      }

      // Persist refreshed access token if credentials were updated
      const refreshed = auth.credentials;
      if (refreshed.access_token && refreshed.access_token !== tokens.access_token) {
        const newExpiry = refreshed.expiry_date ? new Date(refreshed.expiry_date) : null;
        await webhooksRepository.updateGoogleAccessToken(userId, refreshed.access_token, newExpiry);
      }

      // Deduplicar por id (eventos compartilhados podem aparecer em múltiplos calendários)
      const seen = new Set();
      const raw = allItems.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      // Ordenar por start
      raw.sort((a, b) => {
        const sa = a.start?.dateTime || a.start?.date || "";
        const sb = b.start?.dateTime || b.start?.date || "";
        return sa.localeCompare(sb);
      });
      console.log(`[Google Calendar] getCalendarEvents — userId=${userId} total=${raw.length}`);
      raw.forEach((e, i) => {
        console.log(
          `  [${i}] id=${e.id} kind=${e.kind} eventType=${e.eventType || "-"} status=${e.status} ` +
          `allDay=${!e.start?.dateTime} start=${e.start?.dateTime || e.start?.date || "-"} title="${e.summary || "(sem título)"}"`
        );
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
      if (error.code === 401 || error.status === 401) {
        return res.status(401).json({ connected: false, error: "Token expirado, reconecte o Google Calendar" });
      }
      res.status(500).json({ error: "Falha ao buscar eventos do Google Calendar" });
    }
  }

  async getCalendarStatus(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

      const connected = await webhooksRepository.hasGoogleTokens(userId);
      res.json({ connected });
    } catch (_err) {
      res.status(500).json({ error: "Falha ao verificar status do Google Calendar" });
    }
  }

  async disconnectCalendar(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

      // Tentar parar os webhooks ativos no Google
      const tokens = await webhooksRepository.getGoogleTokens(userId);
      if (tokens) {
        const activeWebhooks = await webhooksRepository.getActiveWebhooks(userId);
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
            console.warn(`[Google Calendar] Falha ao parar channel ${wh.channel_id}: ${err.message}`);
          }
        }
      }

      // Limpar webhooks e tokens do banco
      await webhooksRepository.clearWebhooks(userId);
      await webhooksRepository.clearGoogleTokens(userId);

      console.log(`[Google Calendar] Desconectado para o usuário ${userId}`);
      res.json({ success: true, message: "Google Calendar desconectado com sucesso" });
    } catch (error) {
      console.error("[Google Calendar Disconnect]", error);
      res.status(500).json({ error: "Falha ao desconectar Google Calendar" });
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
          address: CALENDAR_WEBHOOK_ADDRESS,
          id: channelId,
          type: "web_hook",
        },
      });

      await webhooksRepository.createWebhook({
        calendarId,
        channelId,
        expiresAt: data.expiration ? new Date(Number(data.expiration)) : null,
        resourceId: data.resourceId,
        syncToken: null,
        userId,
      });

      console.log(`[Google Calendar] Webhook registrado — channel: ${channelId}`);
    } catch (error) {
      console.warn(`[Google Calendar] Watch falhou (tokens salvos): ${error.message}`);
    }
  }
}

module.exports = new WebhooksController();
