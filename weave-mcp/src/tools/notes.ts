import { weaveClient } from "../api/client.js";

// --- Ferramenta: list_notes ---
export const listNotesTool = {
  name: "list_notes",
  description: "Lista as notas recentes do Weave às quais o usuário tem acesso.",
  inputSchema: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Opcional: ID do projeto para filtrar as notas.",
      },
      limit: {
        type: "number",
        description: "Número máximo de notas para retornar (padrão 10).",
      },
    },
    required: [],
  },
};

export async function executeListNotes(args: any) {
  try {
    const params: Record<string, string> = {};
    if (args?.projectId) params.projectId = args.projectId;
    if (args?.limit) params.limit = args.limit.toString();

    // Presumindo a rota /notes no backend
    const notes = await weaveClient.get<any>("/notes", params);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(notes, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Erro ao listar notas: ${error.message}` }],
    };
  }
}

// --- Ferramenta: search_notes ---
export const searchNotesTool = {
  name: "search_notes",
  description: "Busca notas no Weave por termo de pesquisa.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "O termo ou frase para buscar nas notas.",
      },
    },
    required: ["query"],
  },
};

export async function executeSearchNotes(args: any) {
  try {
    const params = { search: args.query };
    const notes = await weaveClient.get<any>("/notes", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(notes, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Erro ao buscar notas: ${error.message}` }],
    };
  }
}

// --- Ferramenta: get_note ---
export const getNoteTool = {
  name: "get_note",
  description: "Obtém o conteúdo completo de uma nota específica pelo seu ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "O ID da nota.",
      },
    },
    required: ["id"],
  },
};

export async function executeGetNote(args: any) {
  try {
    const note = await weaveClient.get<any>(`/notes/${args.id}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Erro ao buscar nota: ${error.message}` }],
    };
  }
}

// --- Ferramenta: create_note ---
export const createNoteTool = {
  name: "create_note",
  description: "Cria uma nova nota no Weave.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Título da nota.",
      },
      content: {
        type: "string",
        description: "Conteúdo principal da nota.",
      },
      projectId: {
        type: "string",
        description: "ID do projeto onde a nota será criada.",
      },
    },
    required: ["title", "projectId"],
  },
};

export async function executeCreateNote(args: any) {
  try {
    const note = await weaveClient.post<any>("/notes", args);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Erro ao criar nota: ${error.message}` }],
    };
  }
}
