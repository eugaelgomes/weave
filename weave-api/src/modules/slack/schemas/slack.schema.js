const { z } = require("zod");

/**
 * Validates the request body for setting the default Slack channel.
 */
const setDefaultChannelSchema = z
  .object({
    channel_id: z.string().trim().optional(),
    channelId: z.string().trim().optional(),
    default_channel_id: z.string().trim().optional(),
  })
  .refine(
    (data) => data.channel_id || data.channelId || data.default_channel_id,
    {
      message: "channel_id is required",
      path: ["channel_id"],
    }
  );

/**
 * Validates the query parameters for the Slack OAuth callback.
 */
const slackOauthCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

module.exports = {
  setDefaultChannelSchema,
  slackOauthCallbackSchema,
};
