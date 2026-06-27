const { z } = require("zod");

/**
 * Validates the query parameters for the Google OAuth callback.
 */
const googleCallbackSchema = z.object({
  code: z.string().min(1, "code parameter is required"),
  state: z.string().min(1, "state parameter is required"),
});

/**
 * Validates the query parameters for fetching Google Calendar events.
 */
const getCalendarEventsSchema = z.object({
  timeMin: z.string().datetime("Invalid timeMin date format").optional(),
  timeMax: z.string().datetime("Invalid timeMax date format").optional(),
});

module.exports = {
  googleCallbackSchema,
  getCalendarEventsSchema,
};
