/**
 * @module weave-engine/modules/core/tools/schemas/organization.schema
 * @description JSON Schema definition for the organization.schema AI tool.
 */
const { z } = require("zod");

const getOrganizationDetailsZodSchema = z.object({});

const schemas = [
  {
    name: "get_organization_details",
    description:
      "Retrieves detailed information and metadata about the organization the user belongs to. This tool returns the organization's name, unique name, member count, and the total number of projects.",
    parameters: getOrganizationDetailsZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_organization_details: getOrganizationDetailsZodSchema,
};

module.exports = { schemas, zodSchemas };
