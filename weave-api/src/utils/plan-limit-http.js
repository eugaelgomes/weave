/**
 * Standard HTTP 403 payload when a plan quota blocks an action.
 * Clients may read `code`, `resource`, and `limit_key` for UX without parsing free-form messages.
 *
 * @param {import('express').Response} res
 * @param {{
 *   resource: string,
 *   limit_key: string,
 *   message: string,
 *   error?: string,
 * }} payload
 * @returns {import('express').Response}
 */
function sendPlanLimitExceeded(res, payload) {
  return res.status(403).json({
    code: "PLAN_LIMIT_EXCEEDED",
    error: payload.error || "Plan limit exceeded",
    limit_key: payload.limit_key,
    message: payload.message,
    resource: payload.resource,
  });
}

module.exports = { sendPlanLimitExceeded };
