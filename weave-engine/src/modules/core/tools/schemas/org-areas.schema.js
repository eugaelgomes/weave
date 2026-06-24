/**
 * @module weave-engine/modules/core/tools/schemas/org-areas.schema
 * @description JSON Schema definition for the org-areas.schema AI tool.
 */
const { z } = require("zod");

const listOrgAreasZodSchema = z.object({});

const getOrgAreaZodSchema = z.object({
  areaId: z.string().describe("The UUID of the area to retrieve details for."),
});

const schemas = [
  {
    name: "list_org_areas",
    description:
      "Lists all active areas (departments/teams) of the organization the user belongs to. Returns each area's ID, name, slug, description, parent area (for sub-areas), whether it is the root area, and its active status.",
    parameters: listOrgAreasZodSchema.toJSONSchema(),
  },
  {
    name: "get_org_area",
    description:
      "Fetches detailed information about a specific organization area by its ID, including the list of members assigned to that area with their roles.",
    parameters: getOrgAreaZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  list_org_areas: listOrgAreasZodSchema,
  get_org_area: getOrgAreaZodSchema,
};

module.exports = { schemas, zodSchemas };
