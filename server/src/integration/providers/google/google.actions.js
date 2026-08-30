const { GoogleClient } = require("./google.client");

/**
 * Action definitions for Google Workspace integration.
 */
const googleActions = {
  getCalendarEvents: {
    handler: async (params, credentials) => {
      const client = new GoogleClient(credentials);
      return await client.getCalendarEvents(params);
    },
    schema: {
      calendarId: {
        description: "Calendar identifier (default: primary)",
        required: false,
        type: "string",
      },
      timeMax: { description: "ISO date string upper boundary", required: false, type: "string" },
      timeMin: { description: "ISO date string lower boundary", required: false, type: "string" },
    },
  },

  searchDrive: {
    handler: async (params, credentials) => {
      const client = new GoogleClient(credentials);
      return await client.searchDrive(params);
    },
    schema: {
      limit: { description: "Maximum number of files to return", required: false, type: "number" },
      query: {
        description: "Search query for file title or content",
        required: false,
        type: "string",
      },
    },
  },

  sendEmail: {
    handler: async (params, credentials) => {
      const client = new GoogleClient(credentials);
      return await client.sendEmail(params);
    },
    schema: {
      body: { description: "Email body content", required: true, type: "string" },
      subject: { description: "Email subject line", required: true, type: "string" },
      to: { description: "Recipient email address", required: true, type: "string" },
    },
  },
};

module.exports = { googleActions };
