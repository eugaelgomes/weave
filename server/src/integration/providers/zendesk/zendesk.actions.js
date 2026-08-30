const { ZendeskClient } = require("./zendesk.client");

/**
 * Action definitions for Zendesk integration.
 */
const zendeskActions = {
  createTicket: {
    handler: async (params, credentials) => {
      const client = new ZendeskClient(credentials);
      return await client.createTicket(params);
    },
    schema: {
      comment: { description: "Initial ticket comment body", required: true, type: "string" },
      priority: {
        description: "Priority level (low, normal, high, urgent)",
        required: false,
        type: "string",
      },
      subject: { description: "Ticket subject line", required: true, type: "string" },
    },
  },

  getTicket: {
    handler: async (params, credentials) => {
      const client = new ZendeskClient(credentials);
      return await client.getTicket(params);
    },
    schema: {
      ticketId: { description: "Zendesk Ticket ID", required: true, type: "string|number" },
    },
  },

  listTickets: {
    handler: async (params, credentials) => {
      const client = new ZendeskClient(credentials);
      return await client.listTickets(params);
    },
    schema: {
      limit: { description: "Max tickets to retrieve", required: false, type: "number" },
      status: {
        description: "Ticket status filter (e.g. open, pending, closed)",
        required: false,
        type: "string",
      },
    },
  },
};

module.exports = { zendeskActions };
