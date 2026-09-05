const { SlackClient } = require("./slack.client");

/**
 * Action definitions for Slack integration.
 */
const slackActions = {
  getChannelInfo: {
    handler: async (params, credentials) => {
      const client = new SlackClient(credentials);
      return await client.conversationsInfo(params);
    },
    schema: {
      channel: { description: "Slack Channel ID", required: true, type: "string" },
    },
  },

  sendMessage: {
    handler: async (params, credentials) => {
      const client = new SlackClient(credentials);
      return await client.chatPostMessage(params);
    },
    schema: {
      blocks: { description: "Optional Block Kit elements array", required: false, type: "array" },
      channel: { description: "Slack Channel ID", required: true, type: "string" },
      text: { description: "Message text to send", required: true, type: "string" },
    },
  },
};

module.exports = { slackActions };
