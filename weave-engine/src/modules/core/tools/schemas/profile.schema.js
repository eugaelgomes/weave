const schemas = [
  {
    name: "get_user_profile",
    description:
      "Fetches the current user's profile information (name, timezone, etc). Use this when you need to know who you are talking to.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

module.exports = { schemas };
