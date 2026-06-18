const FORBIDDEN_FUNCTIONS = new Set([]);

const OWNERSHIP_RULES = Object.freeze({
  create_note: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_collaborator_add: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_collaborator_remove: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_content: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_due_date: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_priority: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_stage: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_tags: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_note_title: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  update_project_title: {
    allowCollaborator: true,
    requiresOwnership: false,
  },
  delete_project: {
    allowCollaborator: true, // the handler enforces proper write roles
    requiresOwnership: false,
  },
  delete_note: {
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
