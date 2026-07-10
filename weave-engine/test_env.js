const { z } = require("zod");
const envSchema = z
  .object({
    REDIS_URL: z.string().min(1)
  })
  .refine(
    (data) => {
      return false;
    },
    {
      message: "Missing database configuration."
    }
  );
const result = envSchema.safeParse({});
console.log(result.error.issues);
console.log(Object.keys(result.error));
