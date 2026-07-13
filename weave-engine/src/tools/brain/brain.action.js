/**
 * @module weave-engine/modules/core/tools/actions/brain.action
 * @description Implementation logic for the brain.action AI tool.
 */
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
        brain_content: "No brain files found.",
        success: true,
      };
    }

    let allContent = "";
    for (const file of mdFiles) {
      const filePath = path.join(brainDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      allContent += `\n\n=== Brain Section: ${file} ===\n\n${content}`;
    }

    return {
      brain_content: allContent.trim(),
      success: true,
    };
  } catch (error) {
    return {
      error: `Failed to read agent brain: ${error.message}`,
      success: false,
    };
  }
}

module.exports = {
  consultBrain,
};
