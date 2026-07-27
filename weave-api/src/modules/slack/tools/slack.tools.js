const { z } = require("zod");
const ReadSlackIntegrationsRepository = require("../repositories/read-slack-integrations.repository");
const MutateSlackIntegrationsRepository = require("../repositories/mutate-slack-integrations.repository");

const manageSlackSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_default_channel"),
    channel_id: z.string().describe("ID of the Slack channel"),
    organization_id: z.string().uuid().describe("ID of the organization"),
  }),
  z.object({
    action: z.literal("list"),
    organization_id: z.string().uuid().describe("ID of the organization"),
  }),
  z.object({
    action: z.literal("remove"),
    organization_id: z.string().uuid().describe("ID of the organization"),
  }),
]);

const createSlackTools = (_user) => ({
  manage_slack: {
    description:
      "Manage Slack integrations (add_default_channel, list, remove).",
    handler: async (args) => {
      try {
        const { action, organization_id, channel_id } = args;

        if (action === "add_default_channel") {
          if (!channel_id)
            throw new Error(
              "channel_id is required for add_default_channel action."
            );
          await MutateSlackIntegrationsRepository.updateDefaultChannel(
            organization_id,
            channel_id,
            null
          );
          return {
            content: [
              {
                text: `Successfully set default Slack channel to ${channel_id} for organization ${organization_id}`,
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          const result =
            await ReadSlackIntegrationsRepository.findActiveByOrganizationId(
              organization_id
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
        }

        if (action === "remove") {
          await MutateSlackIntegrationsRepository.softDeleteByOrganizationId(
            organization_id
          );
          return {
            content: [
              {
                text: `Successfully removed Slack integration for organization ${organization_id}`,
                type: "text",
              },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing Slack integration: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_slack",
    schema: manageSlackSchema,
  },
});

module.exports = {
  createSlackTools,
};
