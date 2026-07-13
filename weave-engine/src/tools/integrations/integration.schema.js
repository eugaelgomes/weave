const { z } = require("zod");

const integrationSchemas = [
  {
    function: {
      description:
        "Fetches a summary of all active integrations for the workspace, including Slack and Google Calendar webhooks. Returns a read-only status of connected tools.",
      name: "get_integrations_status",
      parameters: {
        properties: {},
        required: [],
        type: "object",
      },
    },
    type: "function",
  },
];

const integrationZodSchemas = {
  get_integrations_status: z.object({}),
};

module.exports = {
  integrationSchemas,
  integrationZodSchemas,
};
