const { z } = require("zod");

const changePlanSchema = z.object({
  planId: z.string().min(1, "planId is required"),
});

module.exports = {
  changePlanSchema,
};
