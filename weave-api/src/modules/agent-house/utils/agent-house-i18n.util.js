/**
 * @module agent-house/utils/agent-house-i18n.util
 * @description Internationalization dictionary and utilities specific to Weave AI.
 * Handles translation of error messages and internal AI fallbacks based on user locale.
 *
 * Dependencies:
 * - None
 *
 * Used by:
 * - `agent-house/controllers/*.js`: For localized HTTP error messages.
 * - `agent-house/services/chat-orchestrator.service.js`: For fallback texts like "Calling functions...".
 * - `agent-house/utils/*.js`: For throwing localized exceptions during validation or access checks.
 */
/**
 * Dictionary of localized error messages and UI text for Weave AI in pt, en, and es.
 * Keeps standard API responses and validation exceptions localized across all user languages.
 */
const WEAVE_AI_ERRORS = {
  en: {
    // Agents errors
    agentFieldsRequired: "name, model_provider and model_name are required",

    agentNotFound: "Agent not found for the user",

    agentNotFoundOrNoPermission: "Agent not found or permission denied",

    assignProjectFailed: "Error linking agent to project",

    collabIdRequired:
      "update_note_collaborator_add requires collaboratorUserId",

    createAgentFailed: "Error creating agent",

    deleteAgentFailed: "Error deleting agent",

    deleteAgentSuccess: "Agent removed successfully",

    deleteSessionFailed: "Failed to delete chat session",

    duplicateAgentFailed: "Error duplicating agent",

    engineInvalidResponse: "Invalid response received from Weave Engine",

    engineTaskFailed: "Failed to process in Weave Engine",

    engineTimeout: "Timeout waiting for Weave Engine response",

    fetchAgentFailed: "Error fetching agent",

    fetchAgentsFailed: "Error fetching agents",

    fetchHistoryFailed: "Failed to fetch chat history",

    fetchModelsFailed: "Failed to fetch available models",

    fetchProvidersFailed: "Error obtaining providers and models",

    functionNotSupported: (name) => `Function execution not supported: ${name}`,

    invalidArrayField: (field) =>
      `Field "${field}" must be an array of strings or null`,

    invalidJsonField: (field) => `Field "${field}" must be a valid JSON object`,

    invalidModel: 'Invalid "model" field',

    invalidModelValues: 'Field "model" must contain valid "name" and "version"',

    invalidObjectField: (field) => `Field "${field}" must be an object or null`,

    invalidRequestId: 'Field "requestId" must be a valid UUID',

    isActiveMustBeBoolean: "isActive must be a boolean",

    messageRequired: 'Field "message" is required',

    noteAccessDenied: "No permission to modify this note",

    noteCreateFailed: "Failed to create note.",

    noteIdRequired: "noteId is required",

    noteNotAssociatedToProject:
      "The note is not associated with a project. Associate the note with a project before changing the stage.",

    noteNotFound: "Note not found",

    processChatFailed: "Failed to process chat request",

    projectAccessDenied: "No permission to modify this project",

    projectIdRequired: "projectId is required",

    projectNoStages:
      "The project has no stages. Create at least one stage before associating tasks.",

    projectNotFound: "Project not found",

    searchProjectsTermRequired: "search_projects requires searchTerm",
    searchUsersTermRequired: "search_users requires searchTerm",
    sessionIdRequired: "Session ID is required",
    sessionNotFound: "Session not found for the user",
    sessionNotFoundGen: "Session not found",
    shareAgentFailed: "Error sharing agent",
    sharedWithMustBeArray: "sharedWith must be an array",
    stageNotFound: "Stage not found for this project.",
    stageRequired: "Stage is required. Provide a valid stageId for this task.",
    toggleActiveFailed: "Error toggling agent state",
    unassignProjectFailed: "Error unlinking agent from project",
    unauthenticated: "User not authenticated",
    updateAgentFailed: "Error updating agent",
    updateNoteContentEmpty:
      "update_note_content requires non-empty content (string) or blocks (array)",
    updateNoteContentIdRequired: "update_note_content requires noteId",
    updateNoteContentNoText:
      "update_note_content requires non-empty textual content",
  },
  es: {
    // Agents errors
    agentFieldsRequired: "name, model_provider y model_name son obligatorios",

    agentNotFound: "Agente no encontrado para el usuario",

    agentNotFoundOrNoPermission: "Agente no encontrado o sin permiso",

    assignProjectFailed: "Error al vincular el agente al proyecto",

    collabIdRequired:
      "update_note_collaborator_add requiere collaboratorUserId",

    createAgentFailed: "Error al crear el agente",

    deleteAgentFailed: "Error al eliminar el agente",

    deleteAgentSuccess: "Agente de IA eliminado con éxito",

    deleteSessionFailed: "Error al eliminar la sesión de chat",

    duplicateAgentFailed: "Error al duplicar el agente",

    engineInvalidResponse: "Respuesta no válida recibida de Weave Engine",

    engineTaskFailed: "Error al procesar en Weave Engine",

    engineTimeout:
      "Tiempo de espera agotado al esperar la respuesta de Weave Engine",

    fetchAgentFailed: "Error al buscar el agente",

    fetchAgentsFailed: "Error al buscar los agentes",

    fetchHistoryFailed: "Error al obtener el historial de chat",

    fetchModelsFailed: "Error al obtener los modelos disponibles",

    fetchProvidersFailed: "Error al obtener los proveedores y modelos",

    functionNotSupported: (name) =>
      `Función no admitida para ejecución: ${name}`,

    invalidArrayField: (field) =>
      `El campo "${field}" debe ser un array de cadenas o null`,

    invalidJsonField: (field) =>
      `El campo "${field}" debe ser un objeto JSON válido`,

    invalidModel: 'Campo "model" no válido',

    invalidModelValues:
      'El campo "model" debe contener "name" y "version" válidos',

    invalidObjectField: (field) =>
      `El campo "${field}" debe ser un objeto o null`,

    invalidRequestId: 'El campo "requestId" debe ser un UUID válido',

    isActiveMustBeBoolean: "isActive debe ser boolean",

    messageRequired: 'El campo "message" es obligatorio',

    noteAccessDenied: "Sin permiso para modificar esta nota",

    noteCreateFailed: "Error al crear la nota.",

    noteIdRequired: "noteId es obligatorio",

    noteNotAssociatedToProject:
      "La nota no está asociada a un proyecto. Asocie la nota a un proyecto antes de cambiar la etapa.",

    noteNotFound: "Nota no encontrada",

    processChatFailed: "Error al procesar la solicitud de chat",

    projectAccessDenied: "Sin permiso para modificar este proyecto",

    projectIdRequired: "projectId es obligatorio",

    projectNoStages:
      "El proyecto no tiene etapas. Cree al menos una etapa antes de asociar tareas.",

    projectNotFound: "Proyecto no encontrado",

    searchProjectsTermRequired: "search_projects requiere searchTerm",
    searchUsersTermRequired: "search_users requiere searchTerm",
    sessionIdRequired: "El ID de la sesión es obligatorio",
    sessionNotFound: "Sesión no encontrada para el usuario",
    sessionNotFoundGen: "Sesión no encontrada",
    shareAgentFailed: "Error al compartir el agente",
    sharedWithMustBeArray: "sharedWith debe ser un array",
    stageNotFound: "Etapa no encontrada para este proyecto.",
    stageRequired:
      "La etapa es obligatoria. Proporcione un stageId válido para esta tarea.",
    toggleActiveFailed: "Error al alternar el estado del agente",
    unassignProjectFailed: "Error al desvincular el agente del proyecto",
    unauthenticated: "Usuario no autenticado",
    updateAgentFailed: "Error al actualizar el agente",
    updateNoteContentEmpty:
      "update_note_content requiere content (cadena) o blocks (array) no vacío",
    updateNoteContentIdRequired: "update_note_content requiere noteId",
    updateNoteContentNoText:
      "update_note_content requiere contenido de texto no vacío",
  },
  pt: {
    // Agents errors
    agentFieldsRequired: "name, model_provider e model_name são obrigatórios",

    agentNotFound: "Agente não encontrado para o usuário",

    agentNotFoundOrNoPermission: "Agente não encontrado ou sem permissão",

    assignProjectFailed: "Erro ao vincular agente ao projeto",

    collabIdRequired: "update_note_collaborator_add requer collaboratorUserId",

    createAgentFailed: "Erro ao criar agente",

    deleteAgentFailed: "Erro ao deletar agente",

    deleteAgentSuccess: "Agente removido com sucesso",

    deleteSessionFailed: "Falha ao deletar sessão de chat",

    duplicateAgentFailed: "Erro ao duplicar agente",

    engineInvalidResponse: "Resposta inválida recebida do Weave Engine",

    engineTaskFailed: "Falha ao processar no Weave Engine",

    engineTimeout: "Tempo limite ao aguardar resposta do Weave Engine",

    fetchAgentFailed: "Erro ao buscar agente",

    fetchAgentsFailed: "Erro ao buscar agentes",

    fetchHistoryFailed: "Falha ao buscar histórico de chat",

    fetchModelsFailed: "Falha ao buscar modelos disponíveis",

    fetchProvidersFailed: "Erro ao obter provedores e modelos",

    functionNotSupported: (name) =>
      `Função não suportada para execução: ${name}`,

    invalidArrayField: (field) =>
      `Campo "${field}" deve ser array de strings ou null`,

    invalidJsonField: (field) =>
      `Campo "${field}" deve ser um objeto JSON válido`,

    invalidModel: 'Campo "model" inválido',

    invalidModelValues: 'Campo "model" deve conter "name" e "version" válidos',

    invalidObjectField: (field) => `Campo "${field}" deve ser objeto ou null`,

    invalidRequestId: 'Campo "requestId" deve ser um UUID válido',

    isActiveMustBeBoolean: "isActive deve ser boolean",

    messageRequired: 'Campo "message" é obrigatório',

    noteAccessDenied: "Sem permissão para modificar esta nota",

    noteCreateFailed: "Falha ao criar nota.",

    noteIdRequired: "noteId é obrigatório",

    noteNotAssociatedToProject:
      "A nota não está associada a um projeto. Associe a nota a um projeto antes de alterar o estágio.",

    noteNotFound: "Nota não encontrada",

    processChatFailed: "Falha ao processar requisição de chat",

    projectAccessDenied: "Sem permissão para modificar este projeto",

    projectIdRequired: "projectId é obrigatório",

    projectNoStages:
      "O projeto não possui estágios. Crie pelo menos um estágio antes de associar tarefas.",

    projectNotFound: "Projeto não encontrado",

    searchProjectsTermRequired: "search_projects requer searchTerm",
    searchUsersTermRequired: "search_users requer searchTerm",
    sessionIdRequired: "ID da sessão é obrigatório",
    sessionNotFound: "Sessão não encontrada para o usuário",
    sessionNotFoundGen: "Sessão não encontrada",
    shareAgentFailed: "Erro ao compartilhar agente",
    sharedWithMustBeArray: "sharedWith deve ser um array",
    stageNotFound: "Estágio não encontrado para este projeto.",
    stageRequired:
      "Estágio é obrigatório. Informe um stageId válido para esta tarefa.",
    toggleActiveFailed: "Erro ao alternar estado do agente",
    unassignProjectFailed: "Erro ao desvincular agente do projeto",
    unauthenticated: "Usuário não autenticado",
    updateAgentFailed: "Erro ao atualizar agente",
    updateNoteContentEmpty:
      "update_note_content requer content (string) ou blocks (array) não vazio",
    updateNoteContentIdRequired: "update_note_content requer noteId",
    updateNoteContentNoText:
      "update_note_content requer conteúdo textual não vazio",
  },
};

const CHAT_I18N = {
  en: {
    awaitingInput: "Awaiting your confirmation...",
    callingFunctions: "Calling functions...",
    functionResults: (results) => `Execution results:\n${results}`,
    functionUnderstoodFallback: "Understood, proceeding.",
    noContentFallback: "Sorry, I didn't understand.",
    successFallback: "Actions executed successfully.",
  },
  es: {
    awaitingInput: "Esperando tu confirmación...",
    callingFunctions: "Consultando funciones...",
    functionResults: (results) => `Resultados de la ejecución:\n${results}`,
    functionUnderstoodFallback: "Entendido, procediendo.",
    noContentFallback: "Lo siento, no entendí.",
    successFallback: "Acciones ejecutadas con éxito.",
  },
  pt: {
    awaitingInput: "Aguardando sua confirmação...",
    callingFunctions: "Consultando funções...",
    functionResults: (results) => `Resultados da execução:\n${results}`,
    functionUnderstoodFallback: "Entendido, prosseguindo.",
    noContentFallback: "Desculpe, não entendi.",
    successFallback: "Ações executadas com sucesso.",
  },
};

/**
 * Normalizes language code and returns correct translation dictionary.
 * Maps sub-locales (like en-US, pt-BR) to the base dictionary key.
 *
 * @param {string|null|undefined} lang - Raw language code from request/user.
 * @returns {Record<string, string|Function>} Localized translation resource object.
 */
function getI18n(lang) {
  const normalized = String(lang || "pt")
    .trim()
    .substring(0, 2)
    .toLowerCase();
  if (normalized === "en") return WEAVE_AI_ERRORS.en;
  if (normalized === "es") return WEAVE_AI_ERRORS.es;
  return WEAVE_AI_ERRORS.pt;
}

/**
 * Extracts normalized language code from express request user or headers.
 * Prefers explicitly saved user database language, then falls back to Accept-Language.
 *
 * @param {import("express").Request} req - Express request.
 * @returns {string} Normalized language code ("pt", "en", "es").
 */
function getLangFromReq(req) {
  if (req?.user) {
    const userLang = req.user.language || req.user.userLanguage;
    if (userLang) return userLang;
  }
  const acceptLang = req?.headers?.["accept-language"];
  if (acceptLang) {
    const primary = acceptLang.split(",")[0].split("-")[0].toLowerCase();
    if (["en", "es", "pt"].includes(primary)) {
      return primary;
    }
  }
  return "pt";
}

/**
 * Returns localized internal chat orchestrator texts.
 *
 * @param {string|null|undefined} lang - Raw language code.
 * @returns {Record<string, string|Function>} Localized chat texts.
 */
function getLocalChatI18n(lang) {
  const normalized = String(lang || "pt")
    .trim()
    .substring(0, 2)
    .toLowerCase();
  if (normalized === "en") return CHAT_I18N.en;
  if (normalized === "es") return CHAT_I18N.es;
  return CHAT_I18N.pt;
}

module.exports = {
  getI18n,
  getLangFromReq,
  getLocalChatI18n,
  WEAVE_AI_ERRORS,
};
