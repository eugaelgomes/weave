const fs = require("fs").promises;
const path = require("path");

/**
 * Reads the agent manual to provide the AI with self-knowledge about its capabilities.
 * @returns {Promise<object>}
 */
async function consultAgentManual() {
  try {
    const manualPath = path.join(__dirname, "../docs/agent-manual.md");
    const content = await fs.readFile(manualPath, "utf-8");
    return {
      success: true,
      manual_content: content,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read agent manual: ${error.message}`,
    };
  }
}

const schemas = [
  {
    name: "consult_agent_manual",
    description:
      "Fetches the Weave-AI Agent Manual. Use this tool ONLY when the user asks about your capabilities, what you can do, how you work, or what tools you have access to. Do not guess your capabilities; always consult this manual.",
    parameters: {
      type: "object",
      properties: {}, // No parameters needed
      required: [],
    },
  },
];

module.exports = {
  consultAgentManual,
  schemas,
};
