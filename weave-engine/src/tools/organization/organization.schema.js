/**
 * @module weave-engine/modules/core/tools/schemas/organization.schema
 * @description JSON Schema definition for the organization.schema AI tool.
 */
const { z } = require("zod");

const getOrganizationDetailsZodSchema = z.object({});

const schemas = [
  {
    description:
      "Retrieves detailed information and metadata about the organization the user belongs to. This tool returns the organization's name, unique name, member count, and the total number of projects. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "get_organization_details",
    parameters: getOrganizationDetailsZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_organization_details: getOrganizationDetailsZodSchema,
};

module.exports = { schemas, zodSchemas };
