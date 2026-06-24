import { listNotesTool, searchNotesTool, getNoteTool, createNoteTool, executeListNotes, executeSearchNotes, executeGetNote, executeCreateNote, } from "./notes.js";
import { listProjectsTool, executeListProjects } from "./projects.js";
// Exportamos o schema das ferramentas
export const toolsRegistry = [
    listNotesTool,
    searchNotesTool,
    getNoteTool,
    createNoteTool,
    listProjectsTool,
];
// Roteador de execução
export async function handleToolCall(name, args) {
    switch (name) {
        case "list_notes":
            return await executeListNotes(args);
        case "search_notes":
            return await executeSearchNotes(args);
        case "get_note":
            return await executeGetNote(args);
        case "create_note":
            return await executeCreateNote(args);
        case "list_projects":
            return await executeListProjects(args);
        default:
            throw new Error(`Tool desconhecida: ${name}`);
    }
}
