/**
 * Function Calling Schemas
 * Define todas as funções que o agente de IA pode executar
 * Formato compatível com OpenAI Function Calling e similares
 */

const {
  ALLOWED_PROJECT_STATUSES,
  ALLOWED_NOTE_STATUSES,
  ALLOWED_BLOCK_TYPES,
  PROJECT_FIELDS,
} = require("@/utils/patterns/product-patterns");

/**
 * Níveis de segurança para operações
 */
const SecurityLevel = {
  SAFE: "safe", // Leitura, sem efeitos colaterais
  MODERATE: "moderate", // Criação/atualização, requer confirmação
  RESTRICTED: "restricted", // Operações destrutivas, requer confirmação + motivo
  FORBIDDEN: "forbidden", // Nunca permitido para a IA
};

/**
 * Categorias de funções
 */
const FunctionCategory = {
  NOTES: "notes",
  PROJECTS: "projects",
  BLOCKS: "blocks",
  CHAT: "chat",
  USERS: "users",
  SEARCH: "search",
  STATS: "stats",
};

/**
 * =====================================================
 * FUNÇÕES DE NOTAS (Notes)
 * =====================================================
 */

const notesFunctions = {
  get_user_notes: {
    name: "get_user_notes",
    description:
      "Busca todas as notas do usuário. Retorna lista completa de notas com seus metadados, tags, status e colaboradores.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        formatted: {
          type: "boolean",
          description:
            "Se true, retorna formato simplificado. Se false, retorna formato completo com colaboradores.",
          default: false,
        },
      },
      required: [],
    },
    returns: {
      type: "array",
      description: "Array de notas do usuário",
    },
  },

  get_notes_with_pagination: {
    name: "get_notes_with_pagination",
    description:
      "Busca notas com paginação e filtros avançados. Permite filtrar por tags, status, projeto, e buscar por texto.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        page: {
          type: "integer",
          description: "Número da página (começa em 1)",
          default: 1,
          minimum: 1,
        },
        limit: {
          type: "integer",
          description: "Quantidade de notas por página",
          default: 20,
          minimum: 1,
          maximum: 100,
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filtrar por tags específicas",
        },
        status: {
          type: "string",
          enum: ALLOWED_NOTE_STATUSES,
          description: "Filtrar por status da nota (enum notes_status)",
        },
        projectId: {
          type: "string",
          description: "Filtrar por projeto específico (UUID)",
        },
        searchTerm: {
          type: "string",
          description: "Buscar no título e descrição das notas",
        },
        sortBy: {
          type: "string",
          enum: ["created_at", "updated_at", "title"],
          description: "Campo para ordenação",
          default: "updated_at",
        },
        sortOrder: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Ordem de classificação",
          default: "desc",
        },
      },
      required: [],
    },
    returns: {
      type: "object",
      description:
        "Objeto com notes (array), totalCount, currentPage, totalPages",
    },
  },

  get_note_by_id: {
    name: "get_note_by_id",
    description:
      "Busca uma nota específica pelo ID. Retorna todos os detalhes incluindo blocos, colaboradores e projeto associado.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "ID da nota (UUID)",
        },
      },
      required: ["noteId"],
    },
    returns: {
      type: "object",
      description: "Objeto com detalhes completos da nota",
    },
  },

  get_notes_stats: {
    name: "get_notes_stats",
    description:
      "Retorna estatísticas das notas do usuário: total, por status, por tag, e notas mais recentes.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      type: "object",
      description:
        "Estatísticas: totalNotes, byStatus, popularTags, recentNotes",
    },
  },

  search_notes: {
    name: "search_notes",
    description:
      "Busca semântica em notas. Pesquisa no título, descrição e conteúdo dos blocos.",
    category: FunctionCategory.SEARCH,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo de busca",
        },
        limit: {
          type: "integer",
          description: "Máximo de resultados",
          default: 10,
          maximum: 50,
        },
      },
      required: ["query"],
    },
    returns: {
      type: "array",
      description: "Array de notas que correspondem à busca",
    },
  },

  create_note: {
    name: "create_note",
    description:
      "Cria uma nova nota com título, conteúdo, tags e opcionalmente blocos estruturados.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título da nota (máximo 200 caracteres)",
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Conteúdo/descrição da nota",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags para organização (máximo 10)",
          maxItems: 10,
        },
        status: {
          type: "string",
          enum: ALLOWED_NOTE_STATUSES,
          description: "Status inicial da nota",
          default: "open",
        },
        projectId: {
          type: "string",
          description: "ID do projeto para associar (UUID, opcional)",
        },
        blocks: {
          type: "array",
          description: "Blocos estruturados de conteúdo (opcional)",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ALLOWED_BLOCK_TYPES,
              },
              text: { type: "string" },
              properties: { type: "object" },
            },
            required: ["type", "text"],
          },
        },
      },
      required: ["title", "description"],
    },
    returns: {
      type: "object",
      description: "Nota criada com ID e metadados",
    },
  },

  update_note: {
    name: "update_note",
    description:
      "Atualiza uma nota existente. Apenas o dono ou colaboradores podem atualizar.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "ID da nota a atualizar (UUID)",
        },
        title: {
          type: "string",
          description: "Novo título (opcional)",
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Nova descrição (opcional)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Novas tags (opcional)",
          maxItems: 10,
        },
        status: {
          type: "string",
          enum: ALLOWED_NOTE_STATUSES,
          description: "Novo status (opcional)",
        },
        blocks: {
          type: "array",
          description:
            "Novo conteúdo estruturado (SUBSTITUI os blocos existentes)",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["paragraph", "heading", "list", "code", "quote", "todo"],
              },
              text: { type: "string" },
              properties: { type: "object" },
            },
            required: ["type", "text"],
          },
        },
      },
      required: ["noteId"],
    },
    returns: {
      type: "object",
      description: "Nota atualizada",
    },
  },

  delete_note: {
    name: "delete_note",
    description:
      "Marca uma nota como deletada (soft delete). Apenas o dono pode deletar.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.RESTRICTED,
    requiresConfirmation: true,
    requiresReason: true,
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "ID da nota a deletar (UUID)",
        },
        reason: {
          type: "string",
          description: "Motivo da deleção (obrigatório para auditoria)",
        },
      },
      required: ["noteId", "reason"],
    },
    returns: {
      type: "object",
      description: "Confirmação da deleção",
    },
  },

  add_note_collaborator: {
    name: "add_note_collaborator",
    description:
      "Adiciona um colaborador a uma nota. Apenas o dono pode adicionar colaboradores.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "ID da nota (UUID)",
        },
        collaboratorId: {
          type: "string",
          description: "ID do usuário a adicionar como colaborador (UUID)",
        },
      },
      required: ["noteId", "collaboratorId"],
    },
    returns: {
      type: "object",
      description: "Colaborador adicionado",
    },
  },

  remove_note_collaborator: {
    name: "remove_note_collaborator",
    description:
      "Remove um colaborador de uma nota. Apenas o dono pode remover.",
    category: FunctionCategory.NOTES,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "ID da nota (UUID)",
        },
        collaboratorId: {
          type: "string",
          description: "ID do colaborador a remover (UUID)",
        },
      },
      required: ["noteId", "collaboratorId"],
    },
    returns: {
      type: "object",
      description: "Confirmação da remoção",
    },
  },
};

/**
 * =====================================================
 * FUNÇÕES DE PROJETOS (Projects)
 * =====================================================
 */

const projectsFunctions = {
  get_user_projects: {
    name: "get_user_projects",
    description:
      "Busca todos os projetos do usuário (como dono ou colaborador).",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      type: "array",
      description: "Array de projetos com metadados completos",
    },
  },

  get_project_by_id: {
    name: "get_project_by_id",
    description:
      "Busca um projeto específico pelo ID com todas as notas associadas.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto (UUID)",
        },
      },
      required: ["projectId"],
    },
    returns: {
      type: "object",
      description: "Projeto com notas associadas e colaboradores",
    },
  },

  get_project_notes: {
    name: "get_project_notes",
    description: "Busca todas as notas associadas a um projeto específico.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto (UUID)",
        },
      },
      required: ["projectId"],
    },
    returns: {
      type: "array",
      description: "Array de notas do projeto",
    },
  },

  create_project: {
    name: "create_project",
    description:
      "Cria um novo projeto com título, descrição, status e propriedades customizadas.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: `Título do projeto (máximo ${PROJECT_FIELDS.TITLE_MAX_LENGTH} caracteres)`,
          maxLength: PROJECT_FIELDS.TITLE_MAX_LENGTH,
        },
        description: {
          type: "string",
          description: `Descrição do projeto (máximo ${PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH} caracteres)`,
          maxLength: PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH,
        },
        status: {
          type: "string",
          enum: ALLOWED_PROJECT_STATUSES,
          description: "Status do projeto",
          default: "ativo",
        },
        properties: {
          type: "object",
          description:
            "Propriedades customizadas (ex: prioridade, categoria, deadline)",
          properties: {
            priority: {
              type: "string",
              enum: PROJECT_FIELDS.ALLOWED_PRIORITIES,
            },
            category: { type: "string" },
            deadline: { type: "string", format: "date" },
          },
        },
      },
      required: ["title", "description"],
    },
    returns: {
      type: "object",
      description: "Projeto criado com ID e metadados",
    },
  },

  update_project: {
    name: "update_project",
    description:
      "Atualiza um projeto existente. Apenas o dono ou colaboradores podem atualizar.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto a atualizar (UUID)",
        },
        title: {
          type: "string",
          description: "Novo título (opcional)",
          maxLength: PROJECT_FIELDS.TITLE_MAX_LENGTH,
        },
        description: {
          type: "string",
          description: "Nova descrição (opcional)",
          maxLength: PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH,
        },
        status: {
          type: "string",
          enum: ALLOWED_PROJECT_STATUSES,
          description: "Novo status (opcional)",
        },
        properties: {
          type: "object",
          description: "Atualizar propriedades (opcional)",
        },
      },
      required: ["projectId"],
    },
    returns: {
      type: "object",
      description: "Projeto atualizado",
    },
  },

  delete_project: {
    name: "delete_project",
    description:
      "Marca um projeto como deletado (soft delete). Apenas o dono pode deletar.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.RESTRICTED,
    requiresConfirmation: true,
    requiresReason: true,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto a deletar (UUID)",
        },
        reason: {
          type: "string",
          description: "Motivo da deleção (obrigatório para auditoria)",
        },
      },
      required: ["projectId", "reason"],
    },
    returns: {
      type: "object",
      description: "Confirmação da deleção",
    },
  },

  add_note_to_project: {
    name: "add_note_to_project",
    description: "Associa uma nota existente a um projeto.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto (UUID)",
        },
        noteId: {
          type: "string",
          description: "ID da nota a associar (UUID)",
        },
      },
      required: ["projectId", "noteId"],
    },
    returns: {
      type: "object",
      description: "Confirmação da associação",
    },
  },

  remove_note_from_project: {
    name: "remove_note_from_project",
    description: "Remove associação de uma nota com um projeto.",
    category: FunctionCategory.PROJECTS,
    security: SecurityLevel.MODERATE,
    requiresConfirmation: true,
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "ID do projeto (UUID)",
        },
        noteId: {
          type: "string",
          description: "ID da nota a desassociar (UUID)",
        },
      },
      required: ["projectId", "noteId"],
    },
    returns: {
      type: "object",
      description: "Confirmação da remoção",
    },
  },
};

const blocksFunctions = {};

/**
 * =====================================================
 * FUNÇÕES DE CHAT (Chat Sessions)
 * =====================================================
 */

const chatFunctions = {
  get_chat_sessions: {
    name: "get_chat_sessions",
    description:
      "Lista todas as sessões de chat do usuário ordenadas por última atualização.",
    category: FunctionCategory.CHAT,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Máximo de sessões a retornar",
          default: 50,
          maximum: 100,
        },
      },
      required: [],
    },
    returns: {
      type: "array",
      description: "Array de sessões com contagem de mensagens",
    },
  },

  get_chat_messages: {
    name: "get_chat_messages",
    description: "Busca todas as mensagens de uma sessão de chat específica.",
    category: FunctionCategory.CHAT,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "ID da sessão de chat (UUID)",
        },
      },
      required: ["sessionId"],
    },
    returns: {
      type: "array",
      description: "Array de mensagens ordenadas por data",
    },
  },

  create_chat_session: {
    name: "create_chat_session",
    description:
      "Cria uma nova sessão de chat. Útil para organizar conversas por tópico.",
    category: FunctionCategory.CHAT,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: 'Título da conversa (opcional, default "Nova Conversa")',
          default: "Nova Conversa",
        },
      },
      required: [],
    },
    returns: {
      type: "object",
      description: "Sessão criada com ID",
    },
  },
};

/**
 * =====================================================
 * FUNÇÕES DE USUÁRIOS (Users)
 * =====================================================
 */

const usersFunctions = {
  get_user_profile: {
    name: "get_user_profile",
    description:
      "Retorna informações do perfil do usuário atual (nome, email, avatar).",
    category: FunctionCategory.USERS,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      type: "object",
      description: "Perfil do usuário",
    },
  },

  search_users: {
    name: "search_users",
    description:
      "Busca usuários por username ou email. Útil para adicionar colaboradores.",
    category: FunctionCategory.SEARCH,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {
        searchTerm: {
          type: "string",
          description: "Termo de busca (username ou email)",
          minLength: 2,
        },
      },
      required: ["searchTerm"],
    },
    returns: {
      type: "array",
      description: "Array de usuários encontrados (máximo 10)",
    },
  },
};

/**
 * =====================================================
 * FUNÇÕES DE ESTATÍSTICAS (Stats)
 * =====================================================
 */

const statsFunctions = {
  get_dashboard_stats: {
    name: "get_dashboard_stats",
    description:
      "Retorna estatísticas gerais do usuário: total de notas, projetos, tags populares, atividade recente.",
    category: FunctionCategory.STATS,
    security: SecurityLevel.SAFE,
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      type: "object",
      description:
        "Objeto com totalNotes, totalProjects, popularTags, recentActivity",
    },
  },
};

/**
 * =====================================================
 * AGREGAÇÃO DE TODAS AS FUNÇÕES
 * =====================================================
 */

const allFunctions = {
  ...notesFunctions,
  ...projectsFunctions,
  ...blocksFunctions,
  ...chatFunctions,
  ...usersFunctions,
  ...statsFunctions,
};

/**
 * Obter funções por nível de segurança
 */
function getFunctionsBySecurityLevel(level) {
  return Object.values(allFunctions).filter((fn) => fn.security === level);
}

/**
 * Obter funções por categoria
 */
function getFunctionsByCategory(category) {
  return Object.values(allFunctions).filter((fn) => fn.category === category);
}

/**
 * Obter schema de uma função específica
 */
function getFunctionSchema(functionName) {
  return allFunctions[functionName] || null;
}

/**
 * Validar se uma função existe e está disponível
 */
function isFunctionAvailable(functionName) {
  const func = allFunctions[functionName];
  return func && func.security !== SecurityLevel.FORBIDDEN;
}

/**
 * Obter lista de nomes de funções disponíveis
 */
function getAvailableFunctionNames() {
  return Object.keys(allFunctions).filter(
    (name) => allFunctions[name].security !== SecurityLevel.FORBIDDEN
  );
}

/**
 * Converter para formato OpenAI Function Calling
 */
function toOpenAIFormat(functionName) {
  const schema = allFunctions[functionName];
  if (!schema) return null;

  return {
    name: schema.name,
    description: schema.description,
    parameters: schema.parameters,
  };
}

/**
 * Converter todas as funções para formato OpenAI
 */
function getAllInOpenAIFormat() {
  return Object.keys(allFunctions)
    .filter((name) => allFunctions[name].security !== SecurityLevel.FORBIDDEN)
    .map((name) => toOpenAIFormat(name));
}

module.exports = {
  SecurityLevel,
  FunctionCategory,
  allFunctions,
  notesFunctions,
  projectsFunctions,
  blocksFunctions,
  chatFunctions,
  usersFunctions,
  statsFunctions,
  getFunctionsBySecurityLevel,
  getFunctionsByCategory,
  getFunctionSchema,
  isFunctionAvailable,
  getAvailableFunctionNames,
  toOpenAIFormat,
  getAllInOpenAIFormat,
};
