const DEFAULT_METHODOLOGY = "kanban";
const DEFAULT_VIEW = "board";

const BASE_PROJECT_PROPERTIES = {
  // UI & Design
  color: null,
  icon: null,
  tags: [],
  // Tempo e Prioridade
  priority: null,
  complexity: null,
  estimated_time: null,
  progress: 0,
  // Metodologias
  type: "custom",
  wip_limit_enabled: false,
  lead_time_target_days: null,
  sprint_duration_weeks: null,
  estimation_type: null,
};

const BASE_STAGE_PROPERTIES = {
  is_done: false,
  wip_limit: null,
  description: null,
  auto_assign_to_creator: false,
};

const METHODOLOGY_CONFIGS = {
  kanban: {
    properties: {
      wip_limit_enabled: true,
      lead_time_target_days: 7,
      type: "continuous_flow",
    },
    stages: [
      {
        name: "Backlog",
        position: 0,
        color: "#94a3b8",
        properties: { is_done: false },
      },
      {
        name: "To Do",
        position: 1,
        color: "#e2e8f0",
        properties: { is_done: false },
      },
      {
        name: "Doing",
        position: 2,
        color: "#bfdbfe",
        properties: { is_done: false, wip_limit: 5 },
      },
      {
        name: "Done",
        position: 3,
        color: "#bbf7d0",
        properties: { is_done: true },
      },
    ],
  },
  scrum: {
    properties: {
      sprint_duration_weeks: 2,
      estimation_type: "story_points",
      type: "iterative",
    },
    stages: [
      {
        name: "Product Backlog",
        position: 0,
        color: "#94a3b8",
        properties: { is_done: false },
      },
      {
        name: "Sprint Backlog",
        position: 1,
        color: "#e2e8f0",
        properties: { is_done: false },
      },
      {
        name: "In Progress",
        position: 2,
        color: "#bfdbfe",
        properties: { is_done: false },
      },
      {
        name: "Review / QA",
        position: 3,
        color: "#fef08a",
        properties: { is_done: false },
      },
      {
        name: "Done",
        position: 4,
        color: "#bbf7d0",
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

  const methodology =
    payload.methodology && METHODOLOGY_CONFIGS[payload.methodology]
      ? payload.methodology
      : DEFAULT_METHODOLOGY;

  const default_view = payload.default_view || DEFAULT_VIEW;

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
    user_id: userId,
    org_id: orgId || null,
    title,
    description,
    methodology,
    default_view,
    status: payload.status || "open",
    properties: JSON.stringify(mergedProjectProperties),
    parent_project_id: payload.parent_project_id || null,
  };

  return {
    projectData,
    stagesData: normalizedStages,
  };
};

module.exports = {
  normalizeNewProject,
};
