const fs = require("fs").promises;
const path = require("path");

/**
 * Reads the agent's Brain directory to provide the AI with self-knowledge about its capabilities and ecosystem.
 * @returns {Promise<object>}
 */
async function consultBrain() {
  try {
    const brainDir = path.join(__dirname, "../../docs/brain");
    const files = await fs.readdir(brainDir);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

    if (mdFiles.length === 0) {
      return {
        success: true,
        brain_content: "No brain files found.",
      };
    }

    let allContent = "";
    for (const file of mdFiles) {
      const filePath = path.join(brainDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      allContent += `\n\n=== Brain Section: ${file} ===\n\n${content}`;
    }

    return {
      success: true,
      brain_content: allContent.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read agent brain: ${error.message}`,
    };
  }
}

module.exports = {
  consultBrain,
};
