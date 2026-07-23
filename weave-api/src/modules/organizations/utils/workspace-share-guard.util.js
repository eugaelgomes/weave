const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");

const WORKSPACE_SHARE_DENIED = {
  error: "Partilha não permitida entre contextos de workspace",
  message:
    "Só é possível partilhar com utilizadores do mesmo workspace, ou entre contas pessoais se nenhum dos dois pertencer a um workspace.",
};

/**
 * If actor may not interact with target per workspace rules, sends 403 and returns true.
 *
 * @param {import('express').Response} res
 * @param {string} actorUserId
 * @param {string} targetUserId
 * @returns {Promise<boolean>} True if response was sent (denied).
 */
async function respondIfWorkspaceShareDenied(res, actorUserId, targetUserId) {
  const ok = await workspaceUserScopeRepository.usersMayInteract(
    actorUserId,
    targetUserId
  );
  if (ok) return false;
  res.status(403).json(WORKSPACE_SHARE_DENIED);
  return true;
}

module.exports = {
  respondIfWorkspaceShareDenied,
  WORKSPACE_SHARE_DENIED,
};
