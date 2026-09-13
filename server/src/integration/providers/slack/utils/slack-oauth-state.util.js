const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const secretsService = require("@/services/secrets.service");

const getSecretKey = secretsService.getSecretKey;

const STATE_TTL_SEC = 10 * 60;
const STATE_TYP = "slack-oauth-install";

/**
 * Issues a short-lived signed JWT for Slack OAuth `state` (workspace install flow).
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.userId
 * @returns {string}
 */
function issueSlackInstallState({ workspaceId, userId }) {
  return jwt.sign(
    {
      nonce: crypto.randomBytes(16).toString("hex"),
      userId,
      weaveTyp: STATE_TYP,
      workspaceId,
    },
    getSecretKey(),
    { algorithm: "HS256", expiresIn: STATE_TTL_SEC }
  );
}

/**
 * Verifies and decodes Slack OAuth install state.
 *
 * @param {string} stateToken
 * @returns {{ workspaceId: string, userId: string }|null}
 */
function verifySlackInstallState(stateToken) {
  if (!stateToken || typeof stateToken !== "string") {
    return null;
  }
  try {
    const decoded = jwt.verify(stateToken, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (decoded?.weaveTyp !== STATE_TYP) return null;
    const workspaceId = decoded?.workspaceId;
    const userId = decoded?.userId;
    if (!workspaceId || !userId) return null;
    return { userId: String(userId), workspaceId: String(workspaceId) };
  } catch {
    return null;
  }
}

module.exports = {
  issueSlackInstallState,
  verifySlackInstallState,
};
