const { z } = require("zod");

const adminSchemas = [
  {
    function: {
      description:
        "Gets the current subscription and plan status for the user/organization.",
      name: "get_subscription_status",
      parameters: {
        properties: {},
        required: [],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Gets the usage history for the current billing cycle (e.g., active users, limits).",
      name: "get_usage_history",
      parameters: {
        properties: {},
        required: [],
        type: "object",
      },
    },
    type: "function",
  },
  {
    function: {
      description:
        "Gets a summary of recent automated backups for the workspace.",
      name: "get_backup_summary",
      parameters: {
        properties: {},
        required: [],
        type: "object",
      },
    },
    type: "function",
  },
];

const adminZodSchemas = {
  get_backup_summary: z.object({}),
  get_subscription_status: z.object({}),
  get_usage_history: z.object({}),
};

module.exports = {
  adminSchemas,
  adminZodSchemas,
};
