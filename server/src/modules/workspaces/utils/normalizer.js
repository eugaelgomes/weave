const { getAvailableOrgNames } = require("@/modules/workspaces/repositories/workspaces.repository");
const { WORKSPACE_ROLES } = require("@/modules/workspaces/workspace-role-policy");

const PREDEFINED_PROPERTIES = Object.freeze({
  allowPublicNotes: {
    default: false,
    description: "Allows public notes",
    type: "boolean",
  },
  branding: {
    default: {
      customDomain: null,
      primaryColor: "#ffffff",
      secondaryColor: "#c4c4c4",
    },
    description: "Visual identity",
    type: "object",
  },
  features: {
    default: {
      aiAgent: false,
      backup: true,
      collaboration: false,
      passwordManager: false,
    },
    description: "Active features",
    type: "object",
  },
  language: {
    allowed: ["pt-BR", "en-US", "es-ES", "fr-FR"],
    default: "en-US",
    description: "Default language",
    type: "string",
  },
  maxMembers: {
    default: 10,
    description: "Members limit",
    max: 10000,
    min: 1,
    type: "number",
  },
  maxProjects: {
    default: 5,
    description: "Projects limit",
    max: 100,
    min: 1,
    type: "number",
  },
  notifications: {
    default: {
      digest: "weekly",
      email: true,
      push: false,
    },
    description: "Notification preferences",
    type: "object",
  },
  theme: {
    allowed: ["light", "dark"],
    default: "light",
    description: "Interface theme",
    type: "string",
  },
  timezone: {
    default: "America/Sao_Paulo",
    description: "Time zone",
    type: "string",
  },
});

const normalizeWorkspaceName = (name) => {
  if (typeof name !== "string" || !name) throw new Error("Nome inválido para normalização");

  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove especiais
    .replace(/\s+/g, "-") // Espaço -> Hífen
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-+|-+$/g, ""); // Trim hífens
};

const suggestUniqueWorkspaceName = (baseName, existingNames) => {
  if (!Array.isArray(existingNames)) throw new Error("Lista de nomes existentes inválida");

  const normalized = normalizeWorkspaceName(baseName);
  if (!normalized) throw new Error("Nome base inválido após normalização");

  let uniqueName = normalized;
  let counter = 1;

  while (existingNames.includes(uniqueName)) {
    uniqueName = `${normalized}-${counter++}`;
  }

  return uniqueName;
};

const generateUniqueWorkspaceName = async (baseName) => {
  const normalizedBase = normalizeWorkspaceName(baseName);
  const existingNames = await getAvailableOrgNames(normalizedBase);
  return suggestUniqueWorkspaceName(normalizedBase, existingNames);
};

const isValidValue = (value, def) => {
  // Validação de Tipo
  if (def.type === "object" && (value === null || typeof value !== "object")) return false;
  if (typeof value !== def.type) return false;

  // Validação de Enum (Allowed values)
  if (def.allowed && !def.allowed.includes(value)) return false;

  // Validação de Range (Numbers)
  if (def.type === "number") {
    if (def.min !== undefined && value < def.min) return false;
    if (def.max !== undefined && value > def.max) return false;
  }

  return true;
};

const normalizeWorkspaceProperties = (properties = {}) => {
  if (typeof properties !== "object" || properties === null)
    throw new Error("Properties deve ser um objeto");

  return Object.entries(PREDEFINED_PROPERTIES).reduce((acc, [key, def]) => {
    // Usa valor recebido se válido, senão usa default
    const value = properties[key];
    acc[key] = isValidValue(value, def) ? value : def.default;
    return acc;
  }, {});
};

const updateWorkspaceProperties = (currentProperties = {}, updates = {}) => {
  if (!currentProperties || !updates) throw new Error("Parâmetros inválidos para atualização");

  const nextProps = { ...currentProperties };

  for (const [key, value] of Object.entries(updates)) {
    const def = PREDEFINED_PROPERTIES[key];

    if (!def) continue; // Ignora campos estranhos ao schema

    if (!isValidValue(value, def)) {
      throw new Error(`Valor inválido para '${key}': ${JSON.stringify(value)}`);
    }

    nextProps[key] = value;
  }

  return nextProps;
};

// Getters utilitários
const getDefaultWorkspaceProperties = () => {
  return Object.fromEntries(Object.entries(PREDEFINED_PROPERTIES).map(([k, v]) => [k, v.default]));
};

const getPropertiesSchema = () => {
  // Retorna cópia limpa do schema para documentation/frontend
  return JSON.parse(JSON.stringify(PREDEFINED_PROPERTIES));
};

const validRoles = Object.freeze(Object.values(WORKSPACE_ROLES));

const workspaceDataResponse = (workspace) => {
  return {
    banner_url: workspace.banner_url,
    created_at: workspace.created_at,
    deleted: workspace.deleted,
    description: workspace.description,
    id: workspace.id,
    logo_url: workspace.logo_url,
    public_id: workspace.public_id || null,
    settings: workspace.settings || {},
    unique_name: workspace.unique_name,
    updated_at: workspace.updated_at,
    workspace_name: workspace.workspace_name,
  };
};

module.exports = {
  generateUniqueWorkspaceName,
  getDefaultWorkspaceProperties,
  getPropertiesSchema,
  normalizeWorkspaceName,
  normalizeWorkspaceProperties,

  predefinedProperties: PREDEFINED_PROPERTIES,

  suggestUniqueWorkspaceName,

  updateWorkspaceProperties,

  validRoles,

  // Workspace data formatter
  workspaceDataResponse,
};
