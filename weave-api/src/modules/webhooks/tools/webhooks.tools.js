const { v4: uuidv4 } = require("uuid");
const googleService = require("@/hooks/google/google-calendar");
const GoogleOauthTokensRepository = require("../repositories/google-oauth-tokens.repository");
const GoogleCalendarWebhooksRepository = require("../repositories/google-calendar-webhooks.repository");
const { executeQuery } = require("@/database/connection");
const {
  listWebhooksSchema,
  createWebhookSchema,
  deleteWebhookSchema,
} = require("../schemas/webhooks.schema");

/**
 * Creates the Webhooks tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The webhooks tools definition map.
 */
const createWebhooksTools = (user) => ({
  create_webhook: {
    description:
      "Register a new Google Calendar webhook watch channel for the user's primary or specific calendar.",
    handler: async (args) => {
      try {
        const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
          user.id
        );
        if (!tokens) {
          return {
            content: [
              {
                text: "Google account is not connected. Please connect Google Calendar first before registering a webhook.",
                type: "text",
              },
            ],
            isError: true,
          };
        }

        const channelId = uuidv4();
        const calendarId = args.calendarId || "primary";
        const calendar = googleService.getCalendarClient(tokens);
        const WEBHOOK_BASE =
          process.env.GOOGLE_WEBHOOK_URL || "http://localhost:8080";
        const CALENDAR_WEBHOOK_ADDRESS = `${WEBHOOK_BASE}/api/v1/webhooks/google/calendar`;

        const { data } = await calendar.events.watch({
          calendarId,
          requestBody: {
            address: CALENDAR_WEBHOOK_ADDRESS,
            id: channelId,
            type: "web_hook",
          },
        });

        const newWebhook = await GoogleCalendarWebhooksRepository.createWebhook(
          {
            calendarId,
            channelId,
            expiresAt: data.expiration
              ? new Date(Number(data.expiration))
              : null,
            resourceId: data.resourceId,
            syncToken: null,
            userId: user.id,
          }
        );

        return {
          content: [
            {
              text: JSON.stringify(newWebhook, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error creating webhook: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: createWebhookSchema,
  },
  delete_webhook: {
    description:
      "Disconnect and stop a specific Google Calendar webhook channel, or all active webhooks for the user.",
    handler: async (args) => {
      try {
        const tokens = await GoogleOauthTokensRepository.getGoogleTokens(
          user.id
        );

        if (args.channelId && args.resourceId) {
          if (tokens) {
            try {
              const calendar = googleService.getCalendarClient(tokens);
              await calendar.channels.stop({
                requestBody: {
                  id: args.channelId,
                  resourceId: args.resourceId,
                },
              });
            } catch (err) {
              console.warn(
                `[Google Calendar] Stop channel failed for channel ${args.channelId}: ${err.message}`
              );
            }
          }

          await executeQuery(
            `UPDATE google_calendar_webhooks
             SET is_active = false, deleted = true, updated_at = CURRENT_TIMESTAMP
             WHERE channel_id = $1 AND user_id = $2`,
            [args.channelId, user.id]
          );

          return {
            content: [
              {
                text: `Webhook watch channel ${args.channelId} has been successfully disconnected and deleted.`,
                type: "text",
              },
            ],
          };
        } else {
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
        }
      } catch (error) {
        return {
          content: [
            { text: `Error deleting webhook: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: deleteWebhookSchema,
  },
  list_webhooks: {
    description:
      "List all active Google Calendar webhooks registered for the authenticated user.",
    handler: async () => {
      try {
        const active = await GoogleCalendarWebhooksRepository.getActiveWebhooks(
          user.id
        );
        return {
          content: [
            {
              text: JSON.stringify(active, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing webhooks: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    schema: listWebhooksSchema,
  },
});

module.exports = {
  createWebhooksTools,
};
