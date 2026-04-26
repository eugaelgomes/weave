const FORBIDDEN_FUNCTIONS = new Set([]);

const OWNERSHIP_RULES = Object.freeze({
  create_note: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_content: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_project_title: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
});

/**
 * @param {string} functionName
 * @returns {boolean}
 */
function isFunctionForbidden(functionName) {
  return FORBIDDEN_FUNCTIONS.has(functionName);
}

/**
 * @param {string} functionName
 * @returns {{allowCollaborator: boolean, requiresOwnership: boolean}|null}
 */
function getOwnershipRules(functionName) {
  return OWNERSHIP_RULES[functionName] || null;
}

module.exports = {
  getOwnershipRules,
  isFunctionForbidden,
};
