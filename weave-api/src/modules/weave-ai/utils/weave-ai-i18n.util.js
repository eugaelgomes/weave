/**
 * Dictionary of localized error messages and UI text for Weave AI in pt, en, and es.
 * Keeps standard API responses and validation exceptions localized across all user languages.
 */
const WEAVE_AI_ERRORS = {
  pt: {
    unauthenticated: "Usuário não autenticado",
    invalidArrayField: (field) =>
      `Campo "${field}" deve ser array de strings ou null`,
    invalidObjectField: (field) => `Campo "${field}" deve ser objeto ou null`,
    invalidJsonField: (field) =>
      `Campo "${field}" deve ser um objeto JSON válido`,
    invalidModel: 'Campo "model" inválido',
    invalidModelValues: 'Campo "model" deve conter "name" e "version" válidos',
    messageRequired: 'Campo "message" é obrigatório',
    invalidRequestId: 'Campo "requestId" deve ser um UUID válido',
    noteIdRequired: "noteId é obrigatório",
    noteNotFound: "Nota não encontrada",
    noteAccessDenied: "Sem permissão para modificar esta nota",
    projectIdRequired: "projectId é obrigatório",
    projectNotFound: "Projeto não encontrado",
    projectAccessDenied: "Sem permissão para modificar este projeto",
    engineTimeout: "Tempo limite ao aguardar resposta do Weave Engine",
    engineInvalidResponse: "Resposta inválida recebida do Weave Engine",
    engineTaskFailed: "Falha ao processar no Weave Engine",
    noteCreateFailed: "Falha ao criar nota.",
    projectNoStages:
      "O projeto não possui estágios. Crie pelo menos um estágio antes de associar tarefas.",
    stageNotFound: "Estágio não encontrado para este projeto.",
    updateNoteContentIdRequired: "update_note_content requer noteId",
    updateNoteContentEmpty:
      "update_note_content requer content (string) ou blocks (array) não vazio",
    updateNoteContentNoText:
      "update_note_content requer conteúdo textual não vazio",
    noteNotAssociatedToProject:
      "A nota não está associada a um projeto. Associe a nota a um projeto antes de alterar o estágio.",
    stageRequired:
      "Estágio é obrigatório. Informe um stageId válido para esta tarefa.",
    collabIdRequired: "update_note_collaborator_add requer collaboratorUserId",
    searchUsersTermRequired: "search_users requer searchTerm",
    searchProjectsTermRequired: "search_projects requer searchTerm",
    functionNotSupported: (name) =>
      `Função não suportada para execução: ${name}`,
    agentNotFound: "Agente não encontrado para o usuário",
    sessionNotFound: "Sessão não encontrada para o usuário",
    sessionNotFoundGen: "Sessão não encontrada",
    sessionIdRequired: "ID da sessão é obrigatório",
    processChatFailed: "Falha ao processar requisição de chat",
    fetchHistoryFailed: "Falha ao buscar histórico de chat",
    deleteSessionFailed: "Falha ao deletar sessão de chat",
    fetchModelsFailed: "Falha ao buscar modelos disponíveis",
    // Agents errors
    agentFieldsRequired: "name, model_provider e model_name são obrigatórios",
    sharedWithMustBeArray: "sharedWith deve ser um array",
    agentNotFoundOrNoPermission: "Agente não encontrado ou sem permissão",
    isActiveMustBeBoolean: "isActive deve ser boolean",
    createAgentFailed: "Erro ao criar agente",
    updateAgentFailed: "Erro ao atualizar agente",
    deleteAgentFailed: "Erro ao deletar agente",
    deleteAgentSuccess: "Agente removido com sucesso",
    shareAgentFailed: "Erro ao compartilhar agente",
    fetchAgentsFailed: "Erro ao buscar agentes",
    fetchAgentFailed: "Erro ao buscar agente",
    assignProjectFailed: "Erro ao vincular agente ao projeto",
    unassignProjectFailed: "Erro ao desvincular agente do projeto",
    toggleActiveFailed: "Erro ao alternar estado do agente",
    duplicateAgentFailed: "Erro ao duplicar agente",
    fetchProvidersFailed: "Erro ao obter provedores e modelos",
  },
  en: {
    unauthenticated: "User not authenticated",
    invalidArrayField: (field) =>
      `Field "${field}" must be an array of strings or null`,
    invalidObjectField: (field) => `Field "${field}" must be an object or null`,
    invalidJsonField: (field) => `Field "${field}" must be a valid JSON object`,
    invalidModel: 'Invalid "model" field',
    invalidModelValues: 'Field "model" must contain valid "name" and "version"',
    messageRequired: 'Field "message" is required',
    invalidRequestId: 'Field "requestId" must be a valid UUID',
    noteIdRequired: "noteId is required",
    noteNotFound: "Note not found",
    noteAccessDenied: "No permission to modify this note",
    projectIdRequired: "projectId is required",
    projectNotFound: "Project not found",
    projectAccessDenied: "No permission to modify this project",
    engineTimeout: "Timeout waiting for Weave Engine response",
    engineInvalidResponse: "Invalid response received from Weave Engine",
    engineTaskFailed: "Failed to process in Weave Engine",
    noteCreateFailed: "Failed to create note.",
    projectNoStages:
      "The project has no stages. Create at least one stage before associating tasks.",
    stageNotFound: "Stage not found for this project.",
    updateNoteContentIdRequired: "update_note_content requires noteId",
    updateNoteContentEmpty:
      "update_note_content requires non-empty content (string) or blocks (array)",
    updateNoteContentNoText:
      "update_note_content requires non-empty textual content",
    noteNotAssociatedToProject:
      "The note is not associated with a project. Associate the note with a project before changing the stage.",
    stageRequired: "Stage is required. Provide a valid stageId for this task.",
    collabIdRequired:
      "update_note_collaborator_add requires collaboratorUserId",
    searchUsersTermRequired: "search_users requires searchTerm",
    searchProjectsTermRequired: "search_projects requires searchTerm",
    functionNotSupported: (name) => `Function execution not supported: ${name}`,
    agentNotFound: "Agent not found for the user",
    sessionNotFound: "Session not found for the user",
    sessionNotFoundGen: "Session not found",
    sessionIdRequired: "Session ID is required",
    processChatFailed: "Failed to process chat request",
    fetchHistoryFailed: "Failed to fetch chat history",
    deleteSessionFailed: "Failed to delete chat session",
    fetchModelsFailed: "Failed to fetch available models",
    // Agents errors
    agentFieldsRequired: "name, model_provider and model_name are required",
    sharedWithMustBeArray: "sharedWith must be an array",
    agentNotFoundOrNoPermission: "Agent not found or permission denied",
    isActiveMustBeBoolean: "isActive must be a boolean",
    createAgentFailed: "Error creating agent",
    updateAgentFailed: "Error updating agent",
    deleteAgentFailed: "Error deleting agent",
    deleteAgentSuccess: "Agent removed successfully",
    shareAgentFailed: "Error sharing agent",
    fetchAgentsFailed: "Error fetching agents",
    fetchAgentFailed: "Error fetching agent",
    assignProjectFailed: "Error linking agent to project",
    unassignProjectFailed: "Error unlinking agent from project",
    toggleActiveFailed: "Error toggling agent state",
    duplicateAgentFailed: "Error duplicating agent",
    fetchProvidersFailed: "Error obtaining providers and models",
  },
  es: {
    unauthenticated: "Usuario no autenticado",
    invalidArrayField: (field) =>
      `El campo "${field}" debe ser un array de cadenas o null`,
    invalidObjectField: (field) =>
      `El campo "${field}" debe ser un objeto o null`,
    invalidJsonField: (field) =>
      `El campo "${field}" debe ser un objeto JSON válido`,
    invalidModel: 'Campo "model" no válido',
    invalidModelValues:
      'El campo "model" debe contener "name" y "version" válidos',
    messageRequired: 'El campo "message" es obligatorio',
    invalidRequestId: 'El campo "requestId" debe ser un UUID válido',
    noteIdRequired: "noteId es obligatorio",
    noteNotFound: "Nota no encontrada",
    noteAccessDenied: "Sin permiso para modificar esta nota",
    projectIdRequired: "projectId es obligatorio",
    projectNotFound: "Proyecto no encontrado",
    projectAccessDenied: "Sin permiso para modificar este proyecto",
    engineTimeout:
      "Tiempo de espera agotado al esperar la respuesta de Weave Engine",
    engineInvalidResponse: "Respuesta no válida recibida de Weave Engine",
    engineTaskFailed: "Error al procesar en Weave Engine",
    noteCreateFailed: "Error al crear la nota.",
    projectNoStages:
      "El proyecto no tiene etapas. Cree al menos una etapa antes de asociar tareas.",
    stageNotFound: "Etapa no encontrada para este proyecto.",
    updateNoteContentIdRequired: "update_note_content requiere noteId",
    updateNoteContentEmpty:
      "update_note_content requiere content (cadena) o blocks (array) no vacío",
    updateNoteContentNoText:
      "update_note_content requiere contenido de texto no vacío",
    noteNotAssociatedToProject:
      "La nota no está asociada a un proyecto. Asocie la nota a un proyecto antes de cambiar la etapa.",
    stageRequired:
      "La etapa es obligatoria. Proporcione un stageId válido para esta tarea.",
    collabIdRequired:
      "update_note_collaborator_add requiere collaboratorUserId",
    searchUsersTermRequired: "search_users requiere searchTerm",
    searchProjectsTermRequired: "search_projects requiere searchTerm",
    functionNotSupported: (name) =>
      `Función no admitida para ejecución: ${name}`,
    agentNotFound: "Agente no encontrado para el usuario",
    sessionNotFound: "Sesión no encontrada para el usuario",
    sessionNotFoundGen: "Sesión no encontrada",
    sessionIdRequired: "El ID de la sesión es obligatorio",
    processChatFailed: "Error al procesar la solicitud de chat",
    fetchHistoryFailed: "Error al obtener el historial de chat",
    deleteSessionFailed: "Error al eliminar la sesión de chat",
    fetchModelsFailed: "Error al obtener los modelos disponibles",
    // Agents errors
    agentFieldsRequired: "name, model_provider y model_name son obligatorios",
    sharedWithMustBeArray: "sharedWith debe ser un array",
    agentNotFoundOrNoPermission: "Agente no encontrado o sin permiso",
    isActiveMustBeBoolean: "isActive debe ser boolean",
    createAgentFailed: "Error al crear el agente",
    updateAgentFailed: "Error al actualizar el agente",
    deleteAgentFailed: "Error al eliminar el agente",
    deleteAgentSuccess: "Agente de IA eliminado con éxito",
    shareAgentFailed: "Error al compartir el agente",
    fetchAgentsFailed: "Error al buscar los agentes",
    fetchAgentFailed: "Error al buscar el agente",
    assignProjectFailed: "Error al vincular el agente al proyecto",
    unassignProjectFailed: "Error al desvincular el agente del proyecto",
    toggleActiveFailed: "Error al alternar el estado del agente",
    duplicateAgentFailed: "Error al duplicar el agente",
    fetchProvidersFailed: "Error al obtener los proveedores y modelos",
  },
};

const CHAT_I18N = {
  pt: {
    awaitingInput: "Aguardando sua confirmação...",
    callingFunctions: "Consultando funções...",
    functionResults: (results) => `Resultados da execução:\n${results}`,
    successFallback: "Ações executadas com sucesso.",
    functionUnderstoodFallback: "Entendido, prosseguindo.",
    noContentFallback: "Desculpe, não entendi.",
  },
  en: {
    awaitingInput: "Awaiting your confirmation...",
    callingFunctions: "Calling functions...",
    functionResults: (results) => `Execution results:\n${results}`,
    successFallback: "Actions executed successfully.",
    functionUnderstoodFallback: "Understood, proceeding.",
    noContentFallback: "Sorry, I didn't understand.",
  },
  es: {
    awaitingInput: "Esperando tu confirmación...",
    callingFunctions: "Consultando funciones...",
    functionResults: (results) => `Resultados de la ejecución:\n${results}`,
    successFallback: "Acciones ejecutadas con éxito.",
    functionUnderstoodFallback: "Entendido, procediendo.",
    noContentFallback: "Lo siento, no entendí.",
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
  getLocalChatI18n,
  getLangFromReq,
  WEAVE_AI_ERRORS,
};
