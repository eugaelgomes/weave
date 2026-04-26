const notesRepository = require("@/modules/notes/notes.repository");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const {
  FunctionCategory,
  getAvailableFunctionNames,
  getFunctionSchema,
  toOpenAIFormat,
} = require("@/services/weave-ai/functions/function-schemas");
const {
  getOwnershipRules,
  isFunctionForbidden,
} = require("@/services/weave-ai/policies/security-policies");

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {object} [params.context]
 * @returns {Promise<object>}
 */
async function loadResourceAccessContext({ userId, context = {} }) {
  const result = {
    note: {
      accessible: true,
      exists: false,
      isCollaborator: false,
      isOwner: false,
      noteId: context.noteId || null,
    },
    project: {
      accessible: true,
      exists: false,
      isCollaborator: false,
      isOwner: false,
      projectId: context.projectId || null,
    },
  };

  if (context.noteId) {
    const note = await notesRepository.getNoteById(context.noteId);
    result.note.exists = Boolean(note);
    if (!note) {
      result.note.accessible = false;
    } else {
      const ownerId = String(note.user_id || "");
      const collaborators = Array.isArray(note.collaborators) ? note.collaborators : [];
      const isCollaborator = collaborators.some(
        (item) => String(item.id || item.user_id || "") === String(userId)
      );
      result.note.isOwner = ownerId === String(userId);
      result.note.isCollaborator = isCollaborator;
      result.note.accessible = result.note.isOwner || result.note.isCollaborator;
    }
  }

  if (context.projectId) {
    const projectResult = await projectsRepository.getProjectByIdWithAccess(
      context.projectId,
      userId
    );
    const project = Array.isArray(projectResult) ? projectResult[0] : projectResult;
    result.project.exists = Boolean(project);
    if (!project) {
      result.project.accessible = false;
    } else {
      const ownerId = String(project.user_id || "");
      const collaborators = Array.isArray(project.collaborators)
        ? project.collaborators
        : [];
      const isCollaborator = collaborators.some(
        (item) => String(item.user_id || item.id || "") === String(userId)
      );
      result.project.isOwner = ownerId === String(userId);
      result.project.isCollaborator = isCollaborator;
      result.project.accessible = result.project.isOwner || result.project.isCollaborator;
    }
  }

  return result;
}

/**
 * @param {object} params
 * @param {string} params.functionName
 * @param {object} params.schema
 * @param {object} params.access
 * @returns {boolean}
 */
function isFunctionAuthorized({ access, functionName, schema }) {
  if (isFunctionForbidden(functionName)) {
    return false;
  }

  const ownershipRules = getOwnershipRules(functionName);
  const category = schema?.category;
  const noteScoped =
    category === FunctionCategory.NOTES || category === FunctionCategory.BLOCKS;
  const projectScoped = category === FunctionCategory.PROJECTS;

  if (noteScoped && !access.note.accessible) {
    return false;
  }

  if (projectScoped && !access.project.accessible) {
    return false;
  }

  if (!ownershipRules) {
    return true;
  }

  if (ownershipRules.requiresOwnership) {
    if (noteScoped && access.note.noteId) {
      return access.note.isOwner;
    }
    if (projectScoped && access.project.projectId) {
      return access.project.isOwner;
    }
  }

  if (!ownershipRules.allowCollaborator) {
    if (noteScoped && access.note.noteId && !access.note.isOwner) {
      return false;
    }
    if (projectScoped && access.project.projectId && !access.project.isOwner) {
      return false;
    }
  }

  return true;
}

/**
 * Resolve authorized function schemas for the current user/context.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {boolean} params.allowEdit
 * @param {object} [params.context]
 * @returns {Promise<{ functions: Array<object>, capabilityRules: object, access: object }>}
 */
async function resolveAuthorizedFunctions({ allowEdit, context = {}, userId }) {
  if (!allowEdit) {
    return {
      access: await loadResourceAccessContext({ context, userId }),
      capabilityRules: {
        reason: "allowEdit disabled",
      },
      functions: [],
    };
  }

  const access = await loadResourceAccessContext({ context, userId });

  const functionNames = getAvailableFunctionNames();
  const authorizedNames = functionNames.filter((functionName) =>
    isFunctionAuthorized({
      access,
      functionName,
      schema: getFunctionSchema(functionName),
    })
  );

  const functions = authorizedNames
    .map((name) => toOpenAIFormat(name))
    .filter(Boolean);

  return {
    access,
    capabilityRules: {
      note: {
        allowCollaborator: access.note.isCollaborator,
        allowOwner: access.note.isOwner,
      },
      project: {
        allowCollaborator: access.project.isCollaborator,
        allowOwner: access.project.isOwner,
      },
    },
    functions,
  };
}

module.exports = {
  resolveAuthorizedFunctions,
};
