const z = require("zod");
try {
  z.object({ a: z.string() }).parse([]);
} catch (e) {
  console.log("object:", JSON.stringify(e.errors));
}
try {
  z.record(z.string()).parse([]);
} catch (e) {
  console.log("record:", JSON.stringify(e.errors));
}
