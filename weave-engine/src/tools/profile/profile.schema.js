/**
 * @module weave-engine/modules/core/tools/schemas/profile.schema
 * @description JSON Schema definition for the profile.schema AI tool.
 */
const { z } = require("zod");

const getUserProfileZodSchema = z.object({});

const schemas = [
  {
    description:
      "Fetches the current user's profile information (name, timezone, etc). Use this when you need to know who you are talking to. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "get_user_profile",
    parameters: getUserProfileZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_user_profile: getUserProfileZodSchema,
};

module.exports = { schemas, zodSchemas };
