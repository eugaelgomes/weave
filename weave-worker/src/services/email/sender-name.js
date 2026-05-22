/**
 * keep in sync with weave-api/src/services/email/sender-name.js
 */

const DEV_SENDER = "Weave <onboarding@resend.dev>";

/**
 * @param {string|undefined|null} from
 * @returns {string|undefined|null}
 */
function normalizeSenderFrom(from) {
  if (!from || typeof from !== "string") {
    return from;
  }

  return from.replace(/^Weave Notes(?=\s*<|\s|$)/, "Weave");
}

module.exports = { DEV_SENDER, normalizeSenderFrom };
