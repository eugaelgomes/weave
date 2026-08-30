/**
 * Normalizes the configured front-end base URL (no trailing slash).
 * @param {string} [url]
 * @returns {string}
 */
function normalizeFrontendBase(url) {
  return (url || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Builds the canonical workspace invite acceptance URL.
 * @param {string} inviteId - organization_member_invites.invite_id (UUID)
 * @param {string} [frontendUrl] - optional override for FRONTEND_URL
 * @returns {string}
 */
function buildAuthInviteUrl(inviteId, frontendUrl) {
  const base = normalizeFrontendBase(frontendUrl);
  return `${base}/auth/?invite_token=${encodeURIComponent(inviteId)}`;
}

module.exports = {
  buildAuthInviteUrl,
  normalizeFrontendBase,
};
