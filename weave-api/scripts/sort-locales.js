const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const locales = ["en-US.js", "pt-BR.js"];
const localesDir = path.join(__dirname, "../src/services/email/i18n/locales");

locales.forEach((file) => {
  const filePath = path.join(localesDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  // Load the module content using require (since it's a standard CommonJS module)
  const translations = require(filePath);

  // Sort the keys alphabetically
  const sortedKeys = Object.keys(translations).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );

  // Re-build the file content
  let content = "/** @type {Record<string, string>} */\nmodule.exports = {\n";
  sortedKeys.forEach((key) => {
    const value = translations[key];
    content += `  ${JSON.stringify(key)}: ${JSON.stringify(value)},\n`;
  });
  content += "};\n";

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Sorted and wrote: ${filePath}`);

  // Run Prettier to format the file
  try {
    execSync(`npx prettier --write "${filePath}"`, { stdio: "inherit" });
    console.log(`Formatted with Prettier: ${file}`);
  } catch (err) {
    console.error(`Error formatting ${file} with Prettier:`, err.message);
  }
});
