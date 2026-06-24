const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "src/modules/core/tools/schemas");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".schema.js"));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, "utf8");

  // Remove import
  content = content.replace(
    /const \{ zodToJsonSchema \} = require\("zod-to-json-schema"\);\n/,
    ""
  );

  // Replace zodToJsonSchema(schema) with schema.toJSONSchema()
  content = content.replace(
    /zodToJsonSchema\(([a-zA-Z0-9_]+ZodSchema)\)/g,
    "$1.toJSONSchema()"
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log("Fixed", file);
}
