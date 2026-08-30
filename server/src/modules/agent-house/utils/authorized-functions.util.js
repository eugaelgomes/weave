const {
  FunctionCategory,
  getAvailableFunctionNames,
  getFunctionSchema,
  toOpenAIFormat,
} = require("./ai-function-schemas.util");
const { getOwnershipRules, isFunctionForbidden } = require("./ai-security-policies.util");

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {object} [params.context]
 * @returns {Promise<object>}
 */
async function loadResourceAccessContext({ _userId, context = {} }) {
  const result = {
    project: {
      accessible: true,
      exists: false,
      isCollaborator: false,
      isOwner: false,
      projectId: context.projectId || null,
    },
  };

  if (context.projectId) {
    result.project.exists = false;
    result.project.accessible = false;
    result.project.isOwner = false;
    result.project.isCollaborator = false;
  }

  return result;
}

/**
 * @param {object} params
 * @param {string} params.functionName
 * @param {object} params.schema
 * @param {object} params.context
 * @returns {boolean}
 */
function isFunctionAuthorized({ access, functionName, schema, context }) {
  if (isFunctionForbidden(functionName)) {
    return false;
  }

  const ownershipRules = getOwnershipRules(functionName);
  const category = schema?.category;

  if (category === FunctionCategory.AGENTS && context?.isSubAgent) {
    return false;
  }

  const projectScoped = category === FunctionCategory.PROJECTS;
  const workspaceScoped =
    category === FunctionCategory.WORKSPACES ||
    functionName.includes("workspace_") ||
    functionName.includes("workspace");

  if (workspaceScoped && !context?.workspaceId) {
    return false;
  }

  if (projectScoped && !access.project.accessible) {
    return false;
  }

  if (!ownershipRules) {
    return true;
  }

  if (ownershipRules.requiresOwnership) {
    if (projectScoped && access.project.projectId) {
      return access.project.isOwner;
    }
  }

  if (!ownershipRules.allowCollaborator) {
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
      context,
      functionName,
      schema: getFunctionSchema(functionName),
    })
  );

  const functions = authorizedNames.map((name) => toOpenAIFormat(name)).filter(Boolean);

  return {
    access,
    capabilityRules: {
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
