const { getAvailableOrgNames } = require("../../repositories/organizations");

const PREDEFINED_PROPERTIES = Object.freeze({
  theme: {
    type: "string",
    default: "light",
    allowed: ["light", "dark", "auto"],
    description: "Tema da interface",
  },
  language: {
    type: "string",
    default: "pt-BR",
    allowed: ["pt-BR", "en-US", "es-ES", "fr-FR"],
    description: "Idioma padrão",
  },
  timezone: {
    type: "string",
    default: "America/Sao_Paulo",
    description: "Fuso horário",
  },
  allowPublicNotes: {
    type: "boolean",
    default: false,
    description: "Permite notas públicas",
  },
  maxMembers: {
    type: "number",
    default: 10,
    min: 1,
    max: 10000,
    description: "Limite de membros",
  },
  maxProjects: {
    type: "number",
    default: 5,
    min: 1,
    max: 100,
    description: "Limite de projetos",
  },
  features: {
    type: "object",
    default: {
      aiAgent: false,
      backup: true,
      collaboration: false,
      passwordManager: false,
    },
    description: "Funcionalidades ativas",
  },
  branding: {
    type: "object",
    default: {
      primaryColor: "#ffffff",
      secondaryColor: "#c4c4c4",
      customDomain: null,
    },
    description: "Identidade visual",
  },
  notifications: {
    type: "object",
    default: {
      email: true,
      push: false,
      digest: "weekly",
    },
    description: "Preferências de notificação",
  },
});

const normalizeOrganizationName = (name) => {
  if (typeof name !== "string" || !name)
    throw new Error("Nome inválido para normalização");

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

const suggestUniqueOrganizationName = (baseName, existingNames) => {
  if (!Array.isArray(existingNames))
    throw new Error("Lista de nomes existentes inválida");

  const normalized = normalizeOrganizationName(baseName);
  if (!normalized) throw new Error("Nome base inválido após normalização");

  let uniqueName = normalized;
  let counter = 1;

  while (existingNames.includes(uniqueName)) {
    uniqueName = `${normalized}-${counter++}`;
  }

  return uniqueName;
};

const generateUniqueOrganizationName = async (baseName) => {
  const normalizedBase = normalizeOrganizationName(baseName);
  const existingNames = await getAvailableOrgNames(normalizedBase);
  return suggestUniqueOrganizationName(normalizedBase, existingNames);
};

const isValidValue = (value, def) => {
  // Validação de Tipo
  if (def.type === "object" && (value === null || typeof value !== "object"))
    return false;
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

const normalizeOrganizationProperties = (properties = {}) => {
  if (typeof properties !== "object" || properties === null)
    throw new Error("Properties deve ser um objeto");

  return Object.entries(PREDEFINED_PROPERTIES).reduce((acc, [key, def]) => {
    // Usa valor recebido se válido, senão usa default
    const value = properties[key];
    acc[key] = isValidValue(value, def) ? value : def.default;
    return acc;
  }, {});
};

const updateOrganizationProperties = (currentProperties = {}, updates = {}) => {
  if (!currentProperties || !updates)
    throw new Error("Parâmetros inválidos para atualização");

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
const getDefaultOrganizationProperties = () => {
  return Object.fromEntries(
    Object.entries(PREDEFINED_PROPERTIES).map(([k, v]) => [k, v.default])
  );
};

const getPropertiesSchema = () => {
  // Retorna cópia limpa do schema para documentation/frontend
  return JSON.parse(JSON.stringify(PREDEFINED_PROPERTIES));
};

const validRoles = ["admin", "member", "guest"];

module.exports = {
  validRoles,
  normalizeOrganizationName,
  suggestUniqueOrganizationName,
  generateUniqueOrganizationName,
  normalizeOrganizationProperties,
  updateOrganizationProperties,
  getDefaultOrganizationProperties,
  getPropertiesSchema,
  predefinedProperties: PREDEFINED_PROPERTIES,
};
