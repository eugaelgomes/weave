const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const secretsService = require("@/services/secrets.service");

const getSecretKey = secretsService.getSecretKey;

const STATE_TTL_SEC = 10 * 60;
const STATE_TYP = "slack-oauth-install";

/**
 * Issues a short-lived signed JWT for Slack OAuth `state` (organization install flow).
 *
 * @param {object} params
 * @param {string} params.organizationId
 * @param {string} params.userId
 * @returns {string}
 */
function issueSlackInstallState({ organizationId, userId }) {
  return jwt.sign(
    {
      nonce: crypto.randomBytes(16).toString("hex"),
      organizationId,
      userId,
      weaveTyp: STATE_TYP,
    },
    getSecretKey(),
    { algorithm: "HS256", expiresIn: STATE_TTL_SEC }
  );
}

/**
 * Verifies and decodes Slack OAuth install state.
 *
 * @param {string} stateToken
 * @returns {{ organizationId: string, userId: string }|null}
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
    const organizationId = decoded?.organizationId;
    const userId = decoded?.userId;
    if (!organizationId || !userId) return null;
    return { organizationId: String(organizationId), userId: String(userId) };
  } catch {
    return null;
  }
}

module.exports = {
  issueSlackInstallState,
  verifySlackInstallState,
};
