const { z } = require("zod");

/**
 * Validates the request body for setting the default Slack channel.
 */
const setDefaultChannelSchema = z
  .object({
    channel_id: z
      .string()
      .trim()
      .optional()
      .describe("The unique Slack channel identifier in snake_case format."),
    channelId: z
      .string()
      .trim()
      .optional()
      .describe("The unique Slack channel identifier in camelCase format."),
    default_channel_id: z
      .string()
      .trim()
      .optional()
      .describe("The default Slack channel identifier in snake_case format."),
    organization_id: z
      .string()
      .trim()
      .min(1, "organization_id is required")
      .describe("The unique identifier of the workspace in UUID format."),
  })
  .refine((data) => data.channel_id || data.channelId || data.default_channel_id, {
    message: "channel_id is required",
    path: ["channel_id"],
  })
  .describe(
    "Schema for setting a default Slack channel for an workspace. Requires an workspace identifier and a channel identifier."
  );

/**
 * Validates the query parameters for the Slack OAuth callback.
 */
const slackOauthCallbackSchema = z
  .object({
    code: z
      .string()
      .optional()
      .describe("The authorization code returned by Slack after a successful authorization flow."),
    error: z
      .string()
      .optional()
      .describe("The error message returned by Slack if the authorization flow fails."),
    state: z
      .string()
      .optional()
      .describe(
        "The state parameter returned by Slack to prevent cross-site request forgery attacks."
      ),
  })
  .describe(
    "Validates the query parameters returned by Slack during the OAuth callback redirection."
  );

const listSlackIntegrationSchema = z
  .object({
    organization_id: z
      .string()
      .min(1, "organization_id is required")
      .describe(
        "The unique identifier of the workspace whose Slack integrations are being retrieved."
      ),
  })
  .describe("Schema for listing the active Slack integration for an workspace.");

const removeSlackIntegrationSchema = z
  .object({
    organization_id: z
      .string()
      .min(1, "organization_id is required")
      .describe(
        "The unique identifier of the workspace whose Slack integration is to be disconnected and removed."
      ),
  })
  .describe("Schema for removing/disconnecting the Slack integration for an workspace.");

module.exports = {
  listSlackIntegrationSchema,
  removeSlackIntegrationSchema,
  setDefaultChannelSchema,
  slackOauthCallbackSchema,
};
