const schemas = [
  {
    name: "get_organization_details",
    description:
      "Retrieves detailed information and metadata about the organization the user belongs to. This tool returns the organization's name, unique name, member count, and the total number of projects.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

module.exports = { schemas };
