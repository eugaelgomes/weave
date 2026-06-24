import { weaveClient } from "../api/client.js";
// --- Ferramenta: list_projects ---
export const listProjectsTool = {
    name: "list_projects",
    description: "Obtém a lista de projetos do Weave aos quais o usuário tem acesso.",
    inputSchema: {
        type: "object",
        properties: {},
        required: [],
    },
};
export async function executeListProjects(args) {
    try {
        const projects = await weaveClient.get("/projects");
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(projects, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Erro ao listar projetos: ${error.message}` }],
        };
    }
}
