const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const googleService = require("@/modules/calendar-events/utils/google-calendar.util");
const GoogleOauthTokensRepository = require("../repositories/google-oauth-tokens.repository");
const GoogleCalendarWebhooksRepository = require("../repositories/google-calendar-webhooks.repository");
const { executeQuery } = require("@/database/connection");

const manageWebhooksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    calendarId: z.string().describe("ID of the calendar"),
  }),
  z.object({
    action: z.literal("delete"),
    all: z
      .boolean()
      .optional()
      .describe("Set to true to delete all active webhooks for the user"),
    channelId: z.string().optional().describe("ID of the channel"),
    resourceId: z.string().optional().describe("ID of the resource"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const createWebhooksTools = (user) => ({
  manage_webhooks: {
    description: "Manage Google Calendar webhooks (create, delete, list).",
    handler: async (args) => {
      try {
        const { action, calendarId, channelId, resourceId, all } = args;

        if (action === "create") {
          const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
            user.id
          );
          if (!tokens)
            throw new Error(
              "Google account is not connected. Please connect Google Calendar first before registering a webhook."
            );

          const newChannelId = uuidv4();
          const targetCalendarId = calendarId || "primary";
          const calendar = googleService.getCalendarClient(tokens);
          const WEBHOOK_BASE =
            process.env.GOOGLE_WEBHOOK_URL || "http://localhost:8080";
          const CALENDAR_WEBHOOK_ADDRESS = `${WEBHOOK_BASE}/api/v1/webhooks/google/calendar`;

          const { data } = await calendar.events.watch({
            calendarId: targetCalendarId,
            requestBody: {
              address: CALENDAR_WEBHOOK_ADDRESS,
              id: newChannelId,
              type: "web_hook",
            },
          });

          const newWebhook =
            await GoogleCalendarWebhooksRepository.createWebhook({
              calendarId: targetCalendarId,
              channelId: newChannelId,
              expiresAt: data.expiration
                ? new Date(Number(data.expiration))
                : null,
              resourceId: data.resourceId,
              syncToken: null,
              userId: user.id,
            });

          return {
            content: [
              { text: JSON.stringify(newWebhook, null, 2), type: "text" },
            ],
          };
        }

        if (action === "delete") {
          const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
            user.id
          );
          if (channelId && resourceId) {
            if (tokens) {
              try {
                const calendar = googleService.getCalendarClient(tokens);
                await calendar.channels.stop({
                  requestBody: { id: channelId, resourceId },
                });
              } catch (err) {
                console.warn(
                  `[Google Calendar] Stop channel failed for channel ${channelId}: ${err.message}`
                );
              }
            }
            await executeQuery(
              `UPDATE google_calendar_webhooks SET is_active = false, deleted = true, updated_at = CURRENT_TIMESTAMP WHERE channel_id = $1 AND user_id = $2`,
              [channelId, user.id]
            );
            return {
              content: [
                {
                  text: `Webhook watch channel ${channelId} has been successfully disconnected and deleted.`,
                  type: "text",
                },
              ],
            };
          } else if (all === true) {
            const activeWebhooks =
              await GoogleCalendarWebhooksRepository.getActiveWebhooks(user.id);
            for (const wh of activeWebhooks) {
              if (tokens) {
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
                    `[Google Calendar] Stop channel failed for channel ${wh.channel_id}: ${err.message}`
                  );
                }
              }
            }
            await GoogleCalendarWebhooksRepository.clearWebhooks(user.id);
            return {
              content: [
                {
                  text: "All active Google Calendar webhooks for the user have been successfully disconnected.",
                  type: "text",
                },
              ],
            };
          } else {
            throw new Error(
              "Please provide both channelId and resourceId, or set 'all' to true to delete all webhooks."
            );
          }
        }

        if (action === "list") {
          const active =
            await GoogleCalendarWebhooksRepository.getActiveWebhooks(user.id);
          return {
            content: [{ text: JSON.stringify(active, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing webhooks: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_webhooks",
    schema: manageWebhooksSchema,
  },
});

module.exports = {
  createWebhooksTools,
};
