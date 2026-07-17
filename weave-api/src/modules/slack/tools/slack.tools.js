const {
  listSlackIntegrationSchema,
  removeSlackIntegrationSchema,
  setDefaultChannelSchema,
} = require("../schemas/slack.schema");
const ReadSlackIntegrationsRepository = require("../repositories/read-slack-integrations.repository");
const MutateSlackIntegrationsRepository = require("../repositories/mutate-slack-integrations.repository");

/**
 * Creates the Slack tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The tools definition map.
 */
const createSlackTools = (_user) => ({
  add_default_slack_channel: {
    description:
      "Set the default Slack channel for an organization's Slack integration.",
    handler: async (args) => {
      try {
        const channelId =
          args.channel_id || args.channelId || args.default_channel_id;

        await MutateSlackIntegrationsRepository.updateDefaultChannel(
          args.organization_id,
          channelId,
          null
        );

        return {
          content: [
            {
              text: `Successfully set default Slack channel to ${channelId} for organization ${args.organization_id}`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error setting default Slack channel: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "add_default_slack_channel",
    schema: setDefaultChannelSchema,
  },
  list_slack_integration: {
    description:
      "List the active Slack integration for a specific organization.",
    handler: async (args) => {
      try {
        const result =
          await ReadSlackIntegrationsRepository.findActiveByOrganizationId(
            args.organization_id
          );

        return {
          content: [
            {
              text: result
                ? JSON.stringify(result, null, 2)
                : "No active Slack integration found for this organization.",
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing Slack integration: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_slack_integration",
    schema: listSlackIntegrationSchema,
  },
  remove_slack_integration: {
    description:
      "Remove or disconnect the Slack integration for a specific organization.",
    handler: async (args) => {
      try {
        await MutateSlackIntegrationsRepository.softDeleteByOrganizationId(
          args.organization_id
        );

        return {
          content: [
            {
              text: `Successfully removed Slack integration for organization ${args.organization_id}`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error removing Slack integration: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "remove_slack_integration",
    schema: removeSlackIntegrationSchema,
  },
});

module.exports = {
  createSlackTools,
};
