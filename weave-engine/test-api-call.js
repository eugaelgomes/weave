const {
  callAIProvider,
} = require("./src/modules/core/providers/llm-provider.client.js");

async function run() {
  const options = {
    functions: [
      {
        name: "get_project_details",
        description: "Get details of a project",
        parameters: {
          type: "object",
          properties: { projectId: { type: "string" } },
        },
      },
    ],
    allowEdit: true,
    forceToolUse: true,
    onChunk: (c) => process.stdout.write(c),
  };

  try {
    const res = await callAIProvider({
      prompt:
        "Execute get_project_details for projectId 'b3507864-b8e6-4f28-ae36-9c249c20e793'",
      model: "gemini-3.5-flash",
      systemMessage: "You are a helpful assistant.",
      options,
    });
    console.log("\n\nFINAL RESULT:");
    console.log(JSON.stringify(res.toolCalls, null, 2));
  } catch (err) {
    console.error(err);
  }
}

// We need to run this within the environment context
