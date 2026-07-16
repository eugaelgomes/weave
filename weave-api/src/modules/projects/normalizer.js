const DEFAULT_METHODOLOGY = "kanban";

const BASE_PROJECT_PROPERTIES = {
  // UI & Design
  color: null,
  complexity: null,

  estimated_time: null,

  estimation_type: null,

  icon: null,

  lead_time_target_days: null,
  // Tempo e Prioridade
  priority: null,

  progress: 0,

  sprint_duration_weeks: null,

  tags: [],
  // Metodologias
  type: "custom",
  wip_limit_enabled: false,
};

const BASE_STAGE_PROPERTIES = {
  auto_assign_to_creator: false,
  description: null,
  is_done: false,
  wip_limit: null,
};

const METHODOLOGY_CONFIGS = {
  kanban: {
    properties: {
      lead_time_target_days: 7,
      type: "continuous_flow",
      wip_limit_enabled: true,
    },
    stages: [
      {
        color: "#94a3b8",
        name: "Backlog",
        position: 0,
        properties: { is_done: false },
      },
      {
        color: "#e2e8f0",
        name: "To Do",
        position: 1,
        properties: { is_done: false },
      },
      {
        color: "#bfdbfe",
        name: "Doing",
        position: 2,
        properties: { is_done: false, wip_limit: 5 },
      },
      {
        color: "#bbf7d0",
        name: "Done",
        position: 3,
        properties: { is_done: true },
      },
    ],
  },
  scrum: {
    properties: {
      estimation_type: "story_points",
      sprint_duration_weeks: 2,
      type: "iterative",
    },
    stages: [
      {
        color: "#94a3b8",
        name: "Product Backlog",
        position: 0,
        properties: { is_done: false },
      },
      {
        color: "#e2e8f0",
        name: "Sprint Backlog",
        position: 1,
        properties: { is_done: false },
      },
      {
        color: "#bfdbfe",
        name: "In Progress",
        position: 2,
        properties: { is_done: false },
      },
      {
        color: "#fef08a",
        name: "Review / QA",
        position: 3,
        properties: { is_done: false },
      },
      {
        color: "#bbf7d0",
        name: "Done",
        position: 4,
        properties: { is_done: true },
      },
    ],
  },
};

/**
 * @param {Object} payload - Dados vindos da requisição (req.body)
 * @param {String} userId - ID do utilizador (obtido do token JWT)
 * @param {String} orgId - ID da organização
 * @param {Object} userProps - Propriedades
 * @returns {Object} Objeto estruturado para Repository
 */
const normalizeNewProject = (payload, userId, orgId, userProps = {}) => {
  const title = payload.title?.trim() || "The new project";
  const description = payload.description?.trim() || null;

  const methodologyRaw = payload.methodology;
  const methodologyKey = String(
    methodologyRaw === undefined ||
      methodologyRaw === null ||
      methodologyRaw === ""
      ? DEFAULT_METHODOLOGY
      : methodologyRaw
  ).toLowerCase();
  if (!METHODOLOGY_CONFIGS[methodologyKey]) {
    throw new Error("Metodologia inválida. Use 'kanban' ou 'scrum'.");
  }
  const methodology = methodologyKey;

  const config = METHODOLOGY_CONFIGS[methodology];

  const mergedProjectProperties = {
    ...BASE_PROJECT_PROPERTIES,
    ...config.properties,
    ...userProps,
  };

  const normalizedStages = config.stages.map((stage) => ({
    ...stage,
    properties: {
      ...BASE_STAGE_PROPERTIES,
      ...(stage.properties || {}),
    },
  }));

  const projectData = {
    description,
    methodology: methodology.toUpperCase(),
    organization_id: orgId || null,
    parent_project_id: payload.parent_project_id || null,
    properties: JSON.stringify(mergedProjectProperties),
    status: String(payload.status || "OPEN").toUpperCase(),
    title,
    user_id: userId,
  };

  return {
    projectData,
    stagesData: normalizedStages,
  };
};

module.exports = {
  normalizeNewProject,
};
