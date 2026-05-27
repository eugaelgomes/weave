export const helloWeaveTool = {
  name: "hello_weave",
  description: "Exemplo de uma tool do Weave MCP",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function executeHelloWeave(args: any) {
  return {
    content: [
      {
        type: "text",
        text: "Hello do Weave MCP!",
      },
    ],
  };
}
