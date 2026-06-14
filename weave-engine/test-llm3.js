const { callAIProvider } = require("./src/modules/core/providers/llm-provider.client.js");

async function run() {
  try {
    const result = await callAIProvider({
      model: "openai",
      prompt: "Hello",
      systemMessage: "You are a helpful assistant.",
      options: {
        messages: [
          { role: "user", content: "What is the weather?" },
          { role: "assistant", tool_calls: [{ id: "call_123", type: "function", function: { name: "get_weather", arguments: "{}" } }] },
          { role: "tool", tool_call_id: "call_123", content: "It's sunny." }
        ]
      }
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
