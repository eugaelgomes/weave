/**
 * Security Policies
 * Define políticas de segurança para execução de funções pela IA
 */

const { SecurityLevel } = require("../functions/function-schemas");
const {
  ALLOWED_PROJECT_STATUSES,
  ALLOWED_NOTE_STATUSES,
  ALLOWED_BLOCK_TYPES,
  PROJECT_FIELDS,
} = require("@/utils/patterns/product-patterns");

/**
 * Rate Limits por nível de segurança (requests por minuto)
 */
const rateLimits = {
  [SecurityLevel.SAFE]: {
    requestsPerMinute: 100,
    requestsPerHour: 1000,
    description: "Operações de leitura - rate limit alto",
  },
  [SecurityLevel.MODERATE]: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    description: "Operações de criação/atualização - rate limit moderado",
  },
  [SecurityLevel.RESTRICTED]: {
    requestsPerMinute: 5,
    requestsPerHour: 20,
    description: "Operações destrutivas - rate limit baixo",
  },
  [SecurityLevel.FORBIDDEN]: {
    requestsPerMinute: 0,
    requestsPerHour: 0,
    description: "Operações proibidas para a IA",
  },
};

/**
 * Funções que são explicitamente proibidas para a IA
 * Mesmo que estejam nos repositórios, não devem estar disponíveis
 */
const forbiddenFunctions = [
  "updateUserPassword", // Alterar senha
  "deleteUser", // Deletar conta do usuário
  "createGithubUser", // Criar usuários externos
  "getAllData", // Dump completo de dados (usado apenas para backups)
  "deactivateToken", // Manipular tokens de auth
  "updateUserWithGoogle", // Manipular integração OAuth
];

/**
 * Validações de propriedade
 * Define quais funções requerem que o usuário seja o dono do recurso
 */
const ownershipValidation = {
  // Notas: dono ou colaborador pode ler, apenas dono pode deletar
  get_note_by_id: { requiresOwnership: false, allowCollaborator: true },
  update_note: { requiresOwnership: false, allowCollaborator: true },
  delete_note: { requiresOwnership: true, allowCollaborator: false },
  add_note_collaborator: { requiresOwnership: true, allowCollaborator: false },
  remove_note_collaborator: {
    requiresOwnership: true,
    allowCollaborator: false,
  },

  // Projetos: dono ou colaborador pode ler/atualizar, apenas dono pode deletar
  get_project_by_id: { requiresOwnership: false, allowCollaborator: true },
  update_project: { requiresOwnership: false, allowCollaborator: true },
  delete_project: { requiresOwnership: true, allowCollaborator: false },
  add_note_to_project: { requiresOwnership: false, allowCollaborator: true },
  remove_note_from_project: {
    requiresOwnership: false,
    allowCollaborator: true,
  },

  // Blocos: seguem permissões da nota
  get_note_blocks: { requiresOwnership: false, allowCollaborator: true },
  create_block: { requiresOwnership: false, allowCollaborator: true },
  update_block: { requiresOwnership: false, allowCollaborator: true },
  delete_block: { requiresOwnership: false, allowCollaborator: true },
};

/**
 * Validações de parâmetros
 * Define regras de sanitização e validação para cada tipo de parâmetro
 */
const parameterValidations = {
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    errorMessage: "ID inválido (deve ser UUID v4)",
  },

  title: {
    maxLength: PROJECT_FIELDS.TITLE_MAX_LENGTH,
    minLength: 1,
    sanitize: (value) => value.trim().slice(0, PROJECT_FIELDS.TITLE_MAX_LENGTH),
    errorMessage: `Título deve ter entre 1 e ${PROJECT_FIELDS.TITLE_MAX_LENGTH} caracteres`,
  },

  description: {
    maxLength: 50000,
    sanitize: (value) => value.trim().slice(0, 50000),
    errorMessage: "Descrição muito longa (máximo 50.000 caracteres)",
  },

  projectDescription: {
    maxLength: PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH,
    sanitize: (value) =>
      value.trim().slice(0, PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH),
    errorMessage: `Descrição do projeto muito longa (máximo ${PROJECT_FIELDS.DESCRIPTION_MAX_LENGTH} caracteres)`,
  },

  projectPriority: {
    allowedValues: PROJECT_FIELDS.ALLOWED_PRIORITIES,
    errorMessage: `Prioridade inválida. Valores permitidos: ${PROJECT_FIELDS.ALLOWED_PRIORITIES.join(", ")}`,
  },

  tags: {
    maxItems: 10,
    itemMaxLength: 50,
    sanitize: (tags) =>
      tags
        .slice(0, 10)
        .map((tag) =>
          tag.toLowerCase().trim().replace(/\s+/g, "-").slice(0, 50)
        ),
    errorMessage: "Máximo 10 tags, cada uma com até 50 caracteres",
  },

  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: "Email inválido",
  },

  status: {
    allowedValues: [...ALLOWED_NOTE_STATUSES, ...ALLOWED_PROJECT_STATUSES],
    errorMessage: "Status inválido",
  },

  blockType: {
    allowedValues: ALLOWED_BLOCK_TYPES,
    errorMessage: "Tipo de bloco inválido",
  },
};

/**
 * Mensagens de confirmação para operações que requerem aprovação do usuário
 */
const confirmationMessages = {
  create_note: (params) =>
    `Deseja criar uma nota com o título "${params.title}"?`,

  update_note: (params) => `Deseja atualizar a nota "${params.noteId}"?`,

  delete_note: (params) =>
    `⚠️ ATENÇÃO: Deseja realmente deletar a nota "${params.noteId}"?\nMotivo: ${params.reason}\nEsta ação não pode ser desfeita.`,

  create_project: (params) =>
    `Deseja criar um projeto com o título "${params.title}"?`,

  update_project: (params) =>
    `Deseja atualizar o projeto "${params.projectId}"?`,

  delete_project: (params) =>
    `⚠️ ATENÇÃO: Deseja realmente deletar o projeto "${params.projectId}"?\nMotivo: ${params.reason}\nTodas as notas associadas serão desvinculadas.`,

  add_note_collaborator: (params) =>
    `Deseja adicionar o usuário "${params.collaboratorId}" como colaborador da nota?`,

  remove_note_collaborator: (params) =>
    `Deseja remover o colaborador "${params.collaboratorId}" da nota?`,

  create_block: (params) =>
    `Deseja criar um bloco do tipo "${params.type}" na nota?`,

  update_block: (params) => `Deseja atualizar o bloco "${params.blockId}"?`,

  delete_block: (params) =>
    `Deseja deletar o bloco "${params.blockId}" e todos os seus blocos filhos?`,
};

/**
 * Verifica se uma função é proibida
 */
function isFunctionForbidden(functionName) {
  return forbiddenFunctions.includes(functionName);
}

/**
 * Obtém rate limit para um nível de segurança
 */
function getRateLimit(securityLevel) {
  return rateLimits[securityLevel];
}

/**
 * Obtém regras de propriedade para uma função
 */
function getOwnershipRules(functionName) {
  return ownershipValidation[functionName] || null;
}

/**
 * Valida um parâmetro baseado em seu tipo
 */
function validateParameter(paramName, value, validationType) {
  const validation = parameterValidations[validationType];
  if (!validation) return { valid: true };

  // Validação de pattern (regex)
  if (validation.pattern && !validation.pattern.test(value)) {
    return {
      valid: false,
      error: validation.errorMessage,
    };
  }

  // Validação de valores permitidos
  if (validation.allowedValues && !validation.allowedValues.includes(value)) {
    return {
      valid: false,
      error: validation.errorMessage,
    };
  }

  // Validação de tamanho de string
  if (validation.maxLength && value.length > validation.maxLength) {
    return {
      valid: false,
      error: validation.errorMessage,
    };
  }

  if (validation.minLength && value.length < validation.minLength) {
    return {
      valid: false,
      error: validation.errorMessage,
    };
  }

  // Validação de array
  if (Array.isArray(value)) {
    if (validation.maxItems && value.length > validation.maxItems) {
      return {
        valid: false,
        error: validation.errorMessage,
      };
    }

    if (validation.itemMaxLength) {
      const invalidItem = value.find(
        (item) => item.length > validation.itemMaxLength
      );
      if (invalidItem) {
        return {
          valid: false,
          error: validation.errorMessage,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Sanitiza um parâmetro baseado em seu tipo
 */
function sanitizeParameter(value, validationType) {
  const validation = parameterValidations[validationType];
  if (!validation || !validation.sanitize) return value;

  return validation.sanitize(value);
}

/**
 * Obtém mensagem de confirmação para uma função
 */
function getConfirmationMessage(functionName, params) {
  const messageGenerator = confirmationMessages[functionName];
  if (!messageGenerator) {
    return `Deseja executar a ação "${functionName}"?`;
  }

  return messageGenerator(params);
}

/**
 * Verifica se uma operação requer confirmação do usuário
 */
function requiresUserConfirmation(securityLevel) {
  return (
    securityLevel === SecurityLevel.MODERATE ||
    securityLevel === SecurityLevel.RESTRICTED
  );
}

/**
 * Verifica se uma operação requer justificativa (reason)
 */
function requiresReason(securityLevel) {
  return securityLevel === SecurityLevel.RESTRICTED;
}

module.exports = {
  rateLimits,
  forbiddenFunctions,
  ownershipValidation,
  parameterValidations,
  confirmationMessages,
  isFunctionForbidden,
  getRateLimit,
  getOwnershipRules,
  validateParameter,
  sanitizeParameter,
  getConfirmationMessage,
  requiresUserConfirmation,
  requiresReason,
};
