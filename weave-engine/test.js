const { z } = require("zod");

const searchMyNotesZodSchema = z.object({
  query: z.string().describe("Keyword or phrase to search for in notes/tasks."),
});

console.log(JSON.stringify(searchMyNotesZodSchema.toJSONSchema(), null, 2));
