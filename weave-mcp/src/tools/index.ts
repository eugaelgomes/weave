import { helloWeaveTool, executeHelloWeave } from "./helloWeave.js";

// Exportamos o schema das ferramentas
export const toolsRegistry = [helloWeaveTool];

// Roteador de execução
export async function handleToolCall(name: string, args: any) {
  switch (name) {
    case "hello_weave":
      return await executeHelloWeave(args);
    // Adicione os próximos cases aqui conforme novas tools forem criadas
    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}
