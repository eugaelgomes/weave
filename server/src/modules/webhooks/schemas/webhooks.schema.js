const { z } = require("zod");

/**
 * Validates the query parameters for the Google OAuth callback.
 */
const googleCallbackSchema = z
  .object({
    code: z
      .string()
      .min(1, "code parameter is required")
      .describe(
        "The authorization code returned from the Google OAuth authorization server upon user approval."
      ),
    state: z
      .string()
      .min(1, "state parameter is required")
      .describe(
        "The state parameter used to prevent cross-site request forgery attacks by preserving state between the request and callback."
      ),
  })
  .describe(
    "Schema for validating the query parameters received in the Google OAuth callback redirect URL."
  );

/**
 * Validates the query parameters for fetching Google Calendar events.
 */
const getCalendarEventsSchema = z
  .object({
    timeMax: z
      .string()
      .datetime("Invalid timeMax date format")
      .optional()
      .describe(
        "The upper bound (exclusive) for filter range of event start or end times, formatted as an RFC3339 timestamp. If omitted, a default range will be used."
      ),
    timeMin: z
      .string()
      .datetime("Invalid timeMin date format")
      .optional()
      .describe(
        "The lower bound (inclusive) for filter range of event start or end times, formatted as an RFC3339 timestamp. If omitted, a default range will be used."
      ),
  })
  .describe(
    "Schema for validating query parameters when retrieving events from the user's Google Calendars."
  );

/**
 * Schema for listing all active webhooks for the user.
 */
const listWebhooksSchema = z
  .object({})
  .describe(
    "Schema configuration for listing all active Google Calendar webhooks registered for the authenticated user."
  );

/**
 * Schema for creating/registering a Google Calendar webhook watch.
 */
const createWebhookSchema = z
  .object({
    calendarId: z
      .string()
      .optional()
      .describe(
        "The unique identifier of the Google Calendar to watch for changes. If omitted, it defaults to 'primary' representing the user's primary calendar."
      ),
  })
  .describe("Schema configuration for registering a new Google Calendar webhook watch channel.");

/**
 * Schema for deleting/disconnecting a Google Calendar webhook watch.
 */
const deleteWebhookSchema = z
  .object({
    all: z.boolean().optional().describe("Set to true to delete all active webhooks for the user."),
    channelId: z
      .string()
      .optional()
      .describe(
        "The unique identifier of the webhook channel (UUID) that needs to be stopped and deleted. If omitted, all active webhooks for the user will be disconnected."
      ),
    resourceId: z
      .string()
      .optional()
      .describe(
        "The resource identifier returned by Google Calendar when the webhook channel was created. This field is required if channelId is provided to stop the watch channel."
      ),
  })
  .describe(
    "Schema configuration for disconnecting one or all active Google Calendar webhook watch channels."
  );

module.exports = {
  createWebhookSchema,
  deleteWebhookSchema,
  getCalendarEventsSchema,
  googleCallbackSchema,
  listWebhooksSchema,
};
