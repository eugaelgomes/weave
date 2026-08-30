const { MicrosoftClient } = require("./microsoft.client");

/**
 * Action definitions for Microsoft 365 integration.
 */
const microsoftActions = {
  getCalendarEvents: {
    handler: async (params, credentials) => {
      const client = new MicrosoftClient(credentials);
      return await client.getCalendarEvents(params);
    },
    schema: {
      timeMax: { description: "ISO end date", required: false, type: "string" },
      timeMin: { description: "ISO start date", required: false, type: "string" },
    },
  },

  getMail: {
    handler: async (params, credentials) => {
      const client = new MicrosoftClient(credentials);
      return await client.getMail(params);
    },
    schema: {
      search: { description: "Query string to search emails", required: false, type: "string" },
      top: { description: "Max messages to retrieve", required: false, type: "number" },
    },
  },

  sendTeamsMessage: {
    handler: async (params, credentials) => {
      const client = new MicrosoftClient(credentials);
      return await client.sendTeamsMessage(params);
    },
    schema: {
      channelId: {
        description: "Target Teams channel or chat thread ID",
        required: true,
        type: "string",
      },
      message: { description: "Text content of the message", required: true, type: "string" },
    },
  },
};

module.exports = { microsoftActions };
