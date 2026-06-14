const {
  callAIProvider,
} = require("./src/modules/core/providers/llm-provider.client.js");

async function run() {
  try {
    const result = await callAIProvider({
      model: "openai",
      prompt: "Hello, testing function calls",
      options: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
