/**
 * Context Provider
 * Sistema dinâmico de injeção de contexto para o agente de IA
 * Fornece informações relevantes baseadas na situação e necessidades do usuário
 */

const notesRepository = require("@/modules/notes/notes.repository");
const projectsRepository = require("@/modules/projects/projects.repository");
const userRepository = require("@/modules/users/users.repository");
const chatRepository = require("@/modules/weave-ai/weave-ai.repository");

/**
 * Obtém informações temporais atualizadas
 */
function getTemporalContext() {
  const now = new Date();

  return {
    currentDateTime: now.toISOString(),
    timestamp: now.getTime(),
    date: now.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: now.toLocaleTimeString("pt-BR"),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayOfWeek: now.getDay(),
    weekNumber: getWeekNumber(now),
  };
}

/**
 * Obtém número da semana do ano
 */
function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Busca informações do perfil do usuário
 */
async function getUserContext(userId) {
  try {
    const user = await userRepository.getUserById(userId);

    if (!user) {
      return null;
    }

    return {
      id: user.user_id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatar_url,
      accountCreatedAt: user.created_at,
    };
  } catch (error) {
    console.warn("Erro ao buscar contexto do usuário:", error.message);
    return null;
  }
}

/**
 * Busca estatísticas gerais do usuário
 */
async function getStatsContext(userId) {
  try {
    // Busca todas as notas e projetos em paralelo
    const [notes, projects] = await Promise.all([
      notesRepository.getAllNotesByUserId(userId),
      projectsRepository.getAllProjects(userId),
    ]);

    // Calcula estatísticas de notas
    const notesByStatus = {
      open: notes.filter((n) => n.status === "open").length,
      archived: notes.filter((n) => n.status === "archived").length,
      total: notes.length,
    };

    // Calcula estatísticas de projetos
    const projectsByStatus = {
      ativo: projects.filter((p) => p.status === "ativo").length,
      concluído: projects.filter((p) => p.status === "concluído").length,
      total: projects.length,
    };

    // Tags mais usadas
    const allTags = notes.flatMap((n) => n.tags || []);
    const tagCounts = {};
    allTags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      notes: notesByStatus,
      projects: projectsByStatus,
      popularTags,
      totalCollaborations: notes.filter(
        (n) => n.collaborators && n.collaborators.length > 0
      ).length,
    };
  } catch (error) {
    console.warn("Erro ao buscar estatísticas:", error.message);
    return null;
  }
}

/**
 * Busca notas recentes do usuário (filtradas e resumidas)
 */
async function getRecentNotesContext(userId, limit = 10) {
  try {
    const notes = await notesRepository.getAllNotesByUserId(userId);

    return notes.slice(0, limit).map((note) => ({
      id: note.id,
      title: note.title,
      description:
        note.description?.substring(0, 150) +
        (note.description?.length > 150 ? "..." : ""),
      tags: note.tags || [],
      status: note.status,
      updatedAt: note.updated_at,
      hasCollaborators: note.collaborators && note.collaborators.length > 0,
    }));
  } catch (error) {
    console.warn("Erro ao buscar notas recentes:", error.message);
    return [];
  }
}

/**
 * Busca projetos ativos do usuário (filtrados e resumidos)
 */
async function getActiveProjectsContext(userId, limit = 10) {
  try {
    const projects = await projectsRepository.getAllProjects(userId);

    return projects
      .filter((p) => p.status === "ativo")
      .slice(0, limit)
      .map((project) => ({
        id: project.id,
        title: project.title,
        description:
          project.description?.substring(0, 150) +
          (project.description?.length > 150 ? "..." : ""),
        status: project.status,
        properties: project.properties,
        updatedAt: project.updated_at,
        notesCount: project.associated_notes?.length || 0,
      }));
  } catch (error) {
    console.warn("Erro ao buscar projetos ativos:", error.message);
    return [];
  }
}

/**
 * Busca atividade recente do usuário
 */
async function getRecentActivityContext(userId, limit = 5) {
  try {
    const [notes, projects] = await Promise.all([
      notesRepository.getAllNotesByUserId(userId),
      projectsRepository.getAllProjects(userId),
    ]);

    // Combina e ordena por data de atualização
    const activities = [
      ...notes.map((n) => ({
        type: "note",
        id: n.id,
        title: n.title,
        action: "updated",
        timestamp: new Date(n.updated_at),
      })),
      ...projects.map((p) => ({
        type: "project",
        id: p.id,
        title: p.title,
        action: "updated",
        timestamp: new Date(p.updated_at),
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((a) => ({
        ...a,
        timestamp: a.timestamp.toISOString(),
        relativeTime: getRelativeTime(a.timestamp),
      }));
  } catch (error) {
    console.warn("Erro ao buscar atividade recente:", error.message);
    return [];
  }
}

/**
 * Converte timestamp em tempo relativo (ex: "há 2 horas")
 */
function getRelativeTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // segundos

  if (diff < 60) return "há poucos segundos";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} minutos`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} horas`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
  if (diff < 2592000) return `há ${Math.floor(diff / 604800)} semanas`;
  return `há ${Math.floor(diff / 2592000)} meses`;
}

/**
 * Busca contexto específico para uma nota
 */
async function getNoteContext(userId, noteId) {
  try {
    const note = await notesRepository.getNoteById(noteId);

    if (
      !note ||
      (note.user_id !== userId &&
        !(await notesRepository.isCollaborator(noteId, userId)))
    ) {
      return null;
    }

    // Busca blocos da nota
    const blocksRepository = require("@/repositories/blocks-manager");
    const blocks = await blocksRepository.getBlocksByNoteId(noteId);

    // Busca projeto associado se houver
    let project = null;
    if (note.project_id) {
      const projectData = await projectsRepository.getProjectByIdWithAccess(
        note.project_id,
        userId
      );
      project = projectData?.[0] || null;
    }

    return {
      note: {
        id: note.id,
        title: note.title,
        description: note.description,
        tags: note.tags,
        status: note.status,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      },
      blocks: blocks.map((b) => ({
        id: b.id,
        type: b.type,
        text: b.text?.substring(0, 200),
        position: b.position,
      })),
      project: project
        ? {
            id: project.id,
            title: project.title,
          }
        : null,
      collaborators: note.collaborators || [],
    };
  } catch (error) {
    console.warn("Erro ao buscar contexto da nota:", error.message);
    return null;
  }
}

/**
 * Busca contexto específico para um projeto
 */
async function getProjectContext(userId, projectId) {
  try {
    const projectData = await projectsRepository.getProjectByIdWithAccess(
      projectId,
      userId
    );

    if (!projectData || projectData.length === 0) {
      return null;
    }

    const project = projectData[0];

    // Busca notas associadas
    const notes = await projectsRepository.getAssociatedNotes(
      projectId,
      userId
    );

    return {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        properties: project.properties,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        status: n.status,
        tags: n.tags,
      })),
      collaborators: project.collaborators || [],
      stats: {
        totalNotes: notes.length,
        notesByStatus: {
          open: notes.filter((n) => n.status === "open").length,
          archived: notes.filter((n) => n.status === "archived").length,
        },
      },
    };
  } catch (error) {
    console.warn("Erro ao buscar contexto do projeto:", error.message);
    return null;
  }
}

/**
 * Busca contexto de histórico de chat
 */
async function getChatHistoryContext(userId, sessionId, messageLimit = 10) {
  try {
    if (!sessionId) {
      return null;
    }

    const messages = await chatRepository.getSessionMessages(sessionId, userId);

    return {
      sessionId,
      messageCount: messages.length,
      recentMessages: messages.slice(-messageLimit).map((m) => ({
        role: m.role,
        content: m.content?.substring(0, 200),
        timestamp: m.created_at,
      })),
    };
  } catch (error) {
    console.warn("Erro ao buscar histórico do chat:", error.message);
    return null;
  }
}

/**
 * Filtra contexto por relevância baseado no caso de uso
 */
function filterContextByUseCase(useCase, fullContext) {
  const relevantFields = {
    // Chat precisa de tudo
    chat: [
      "temporal",
      "user",
      "stats",
      "recentNotes",
      "activeProjects",
      "recentActivity",
    ],

    // Geração de notas precisa de exemplos e tags populares
    note_generation: ["temporal", "user", "stats", "recentNotes"],
    note_summarization: ["temporal", "noteContext"],
    content_enhancement: ["temporal", "noteContext"],
    tag_suggestion: ["stats", "noteContext"],

    // Projetos precisam de contexto de notas e colaboração
    task_breakdown: ["temporal", "projectContext", "recentActivity"],
    priority_analysis: [
      "temporal",
      "stats",
      "recentActivity",
      "activeProjects",
    ],
    template_generation: ["temporal", "activeProjects"],

    // Pesquisa precisa de contexto mínimo
    research_assistant: ["temporal", "user"],
    link_summarization: ["temporal"],
    trend_analysis: ["temporal", "stats"],
  };

  const fields = relevantFields[useCase] || ["temporal", "user"];
  const filtered = {};

  fields.forEach((field) => {
    if (fullContext[field]) {
      filtered[field] = fullContext[field];
    }
  });

  return filtered;
}

/**
 * Constrói contexto completo para a IA
 */
async function buildContext(userId, useCase, options = {}) {
  const context = {};

  try {
    // Sempre inclui informações temporais
    context.temporal = getTemporalContext();

    // Informações do usuário
    if (userId) {
      context.user = await getUserContext(userId);

      // Estatísticas gerais
      context.stats = await getStatsContext(userId);

      // Notas recentes (com limite configurável)
      context.recentNotes = await getRecentNotesContext(
        userId,
        options.notesLimit || 10
      );

      // Projetos ativos
      context.activeProjects = await getActiveProjectsContext(
        userId,
        options.projectsLimit || 10
      );

      // Atividade recente
      context.recentActivity = await getRecentActivityContext(
        userId,
        options.activityLimit || 5
      );
    }

    // Contexto específico de nota
    if (options.noteId) {
      context.noteContext = await getNoteContext(userId, options.noteId);
    }

    // Contexto específico de projeto
    if (options.projectId) {
      context.projectContext = await getProjectContext(
        userId,
        options.projectId
      );
    }

    // Contexto de histórico de chat
    if (options.sessionId) {
      context.chatHistory = await getChatHistoryContext(
        userId,
        options.sessionId,
        options.chatHistoryLimit || 10
      );
    }

    // Filtra contexto por relevância do caso de uso
    const filtered = filterContextByUseCase(useCase, context);

    return {
      ...filtered,
      metadata: {
        generatedAt: new Date().toISOString(),
        useCase,
        userId,
      },
    };
  } catch (error) {
    console.error("Erro ao construir contexto:", error);
    // Retorna contexto mínimo em caso de erro
    return {
      temporal: getTemporalContext(),
      metadata: {
        generatedAt: new Date().toISOString(),
        useCase,
        userId,
        error: error.message,
      },
    };
  }
}

/**
 * Formata contexto para inclusão em prompts
 */
function formatContextForPrompt(context) {
  const parts = [];

  // Informações temporais
  if (context.temporal) {
    parts.push(
      `📅 **Data e Hora Atual**: ${context.temporal.date} às ${context.temporal.time}`
    );
  }

  // Informações do usuário
  if (context.user) {
    parts.push(
      `👤 **Usuário**: ${context.user.name} (@${context.user.username})`
    );
  }

  // Estatísticas
  if (context.stats) {
    parts.push(`📊 **Estatísticas**:`);
    parts.push(
      `- Notas: ${context.stats.notes?.total || 0} (${context.stats.notes?.open || 0} abertas)`
    );
    parts.push(
      `- Projetos: ${context.stats.projects?.total || 0} (${context.stats.projects?.ativo || 0} ativos)`
    );

    if (context.stats.popularTags && context.stats.popularTags.length > 0) {
      const tags = context.stats.popularTags
        .slice(0, 5)
        .map((t) => t.tag)
        .join(", ");
      parts.push(`- Tags populares: ${tags}`);
    }
  }

  // Notas recentes
  if (context.recentNotes && context.recentNotes.length > 0) {
    parts.push(`\n📝 **Notas Recentes** (${context.recentNotes.length}):`);
    context.recentNotes.slice(0, 5).forEach((note, i) => {
      parts.push(
        `${i + 1}. "${note.title}" ${note.tags?.length > 0 ? `[${note.tags.join(", ")}]` : ""}`
      );
    });
  }

  // Projetos ativos
  if (context.activeProjects && context.activeProjects.length > 0) {
    parts.push(`\n📋 **Projetos Ativos** (${context.activeProjects.length}):`);
    context.activeProjects.slice(0, 5).forEach((project, i) => {
      parts.push(`${i + 1}. "${project.title}" (${project.notesCount} notas)`);
    });
  }

  return parts.join("\n");
}

module.exports = {
  getTemporalContext,
  getUserContext,
  getStatsContext,
  getRecentNotesContext,
  getActiveProjectsContext,
  getRecentActivityContext,
  getNoteContext,
  getProjectContext,
  getChatHistoryContext,
  buildContext,
  formatContextForPrompt,
  filterContextByUseCase,
};
