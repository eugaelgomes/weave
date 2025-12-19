const { getAvailableOrgNames } = require("../../repositories/organizations");

/**
 * Normaliza uma string para ser usada como nome único de organização
 * Remove caracteres especiais, converte para minúsculas e substitui espaços por hífens
 * @param {string} name - Nome a ser normalizado
 * @returns {string} Nome normalizado
 */
const normalizeOrganizationName = (name) => {
  if (!name || typeof name !== "string") {
    throw new Error("Nome inválido: deve ser uma string não vazia");
  }

  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-|-$/g, ""); // Remove hífens do início e fim
};

/**
 * Sugere um nome único de organização baseado em uma lista de nomes existentes
 * Adiciona sufixo numérico se necessário
 * @param {string} baseName - Nome base a ser usado
 * @param {string[]} existingNames - Array de nomes já existentes
 * @returns {string} Nome único sugerido
 */
const suggestUniqueOrganizationName = (baseName, existingNames) => {
  if (!baseName || typeof baseName !== "string") {
    throw new Error("Nome base inválido: deve ser uma string não vazia");
  }

  if (!Array.isArray(existingNames)) {
    throw new Error("existingNames deve ser um array");
  }

  const normalizedBase = normalizeOrganizationName(baseName);

  if (!normalizedBase) {
    throw new Error("Nome base resultou em string vazia após normalização");
  }

  let uniqueName = normalizedBase;
  let counter = 1;

  while (existingNames.includes(uniqueName)) {
    uniqueName = `${normalizedBase}-${counter}`;
    counter += 1;
  }

  return uniqueName;
};

/**
 * Busca nomes existentes no banco e sugere um nome único normalizado
 * @param {string} baseName - Nome base desejado
 * @returns {Promise<string>} Nome único normalizado e disponível
 */
const generateUniqueOrganizationName = async (baseName) => {
  const normalizedBase = normalizeOrganizationName(baseName);
  const existingNames = await getAvailableOrgNames(normalizedBase);
  return suggestUniqueOrganizationName(normalizedBase, existingNames);
};

/**
 * Define as propriedades predefinidas permitidas para organizações
 * Cada propriedade tem tipo, valor padrão e validação
 */
const predefinedProperties = {
  theme: {
    type: "string",
    default: "light",
    allowed: ["light", "dark", "auto"],
    description: "Tema da interface da organização",
  },
  language: {
    type: "string",
    default: "pt-BR",
    defined: ["pt-BR", "en-US", "es-ES", "fr-FR"],
    description: "Idioma padrão da organização",
  },
  timezone: {
    type: "string",
    default: "America/Sao_Paulo",
    description: "Fuso horário da organização",
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
    max: 1000,
    description: "Número máximo de membros",
  },
  maxProjects: {
    type: "number",
    default: 5,
    min: 1,
    max: 100,
    description: "Número máximo de projetos",
  },
  features: {
    type: "object",
    default: {
      aiAgent: false,
      backup: true,
      collaboration: false,
      passwordManager: false,
    },
    description: "Features habilitadas para a organização",
  },
  branding: {
    type: "object",
    default: {
      primaryColor: "#ffffff",
      secondaryColor: "#c4c4c4",
      customDomain: null,
    },
    description: "Configurações de marca da organização",
  },
  notifications: {
    type: "object",
    default: {
      email: true,
      push: false,
      digest: "weekly",
    },
    description: "Configurações de notificações",
  },
};

/**
 * Valida um valor baseado na definição da propriedade
 * @param {any} value - Valor a ser validado
 * @param {Object} definition - Definição da propriedade
 * @returns {boolean} True se válido
 */
const validatePropertyValue = (value, definition) => {
  // Validação de tipo
  if (definition.type === "string" && typeof value !== "string") {
    return false;
  }
  if (definition.type === "number" && typeof value !== "number") {
    return false;
  }
  if (definition.type === "boolean" && typeof value !== "boolean") {
    return false;
  }
  if (
    definition.type === "object" &&
    (typeof value !== "object" || value === null)
  ) {
    return false;
  }

  // Validação de valores permitidos
  if (definition.allowed && !definition.allowed.includes(value)) {
    return false;
  }

  // Validação de min/max para números
  if (definition.type === "number") {
    if (definition.min !== undefined && value < definition.min) {
      return false;
    }
    if (definition.max !== undefined && value > definition.max) {
      return false;
    }
  }

  return true;
};

/**
 * Normaliza as propriedades JSONB da organização
 * Remove propriedades inválidas e aplica valores padrão
 * @param {Object} properties - Propriedades a serem normalizadas
 * @returns {Object} Propriedades normalizadas
 */
const normalizeOrganizationProperties = (properties = {}) => {
  if (typeof properties !== "object" || properties === null) {
    throw new Error("Properties deve ser um objeto");
  }

  const normalized = {};

  // Processa cada propriedade predefinida
  for (const [key, definition] of Object.entries(predefinedProperties)) {
    if (properties.hasOwnProperty(key)) {
      // Se a propriedade existe, valida e usa o valor fornecido
      if (validatePropertyValue(properties[key], definition)) {
        normalized[key] = properties[key];
      } else {
        // Se inválida, usa o valor padrão
        normalized[key] = definition.default;
      }
    } else {
      // Se não existe, usa o valor padrão
      normalized[key] = definition.default;
    }
  }

  return normalized;
};

/**
 * Atualiza propriedades existentes com novos valores
 * Mantém propriedades não modificadas e valida as novas
 * @param {Object} currentProperties - Propriedades atuais
 * @param {Object} updates - Atualizações a serem aplicadas
 * @returns {Object} Propriedades atualizadas
 */
const updateOrganizationProperties = (currentProperties = {}, updates = {}) => {
  if (typeof currentProperties !== "object" || currentProperties === null) {
    throw new Error("Current properties deve ser um objeto");
  }
  if (typeof updates !== "object" || updates === null) {
    throw new Error("Updates deve ser um objeto");
  }

  const normalized = { ...currentProperties };

  // Aplica as atualizações validando cada uma
  for (const [key, value] of Object.entries(updates)) {
    const definition = predefinedProperties[key];

    if (!definition) {
      // Ignora propriedades não predefinidas
      continue;
    }

    if (validatePropertyValue(value, definition)) {
      normalized[key] = value;
    } else {
      throw new Error(
        `Valor inválido para propriedade '${key}': ${JSON.stringify(value)}`
      );
    }
  }

  return normalized;
};

/**
 * Retorna as propriedades padrão para uma nova organização
 * @returns {Object} Propriedades padrão
 */
const getDefaultOrganizationProperties = () => {
  const defaults = {};

  for (const [key, definition] of Object.entries(predefinedProperties)) {
    defaults[key] = definition.default;
  }

  return defaults;
};

/**
 * Retorna a documentação das propriedades disponíveis
 * @returns {Object} Documentação das propriedades
 */
const getPropertiesSchema = () => {
  const schema = {};

  for (const [key, definition] of Object.entries(predefinedProperties)) {
    schema[key] = {
      type: definition.type,
      default: definition.default,
      description: definition.description,
      ...(definition.allowed && { allowed: definition.allowed }),
      ...(definition.min !== undefined && { min: definition.min }),
      ...(definition.max !== undefined && { max: definition.max }),
    };
  }

  return schema;
};

module.exports = {
  normalizeOrganizationName,
  suggestUniqueOrganizationName,
  generateUniqueOrganizationName,
  normalizeOrganizationProperties,
  updateOrganizationProperties,
  getDefaultOrganizationProperties,
  getPropertiesSchema,
  predefinedProperties,
};
